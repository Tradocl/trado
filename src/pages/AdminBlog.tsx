import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { BlogCategory, BlogPost } from "@/lib/blog";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

export default function AdminBlog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    void reload();
  }, [isAdmin]);

  async function reload() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("blog_posts").select("*, category:blog_categories(*)").order("created_at", { ascending: false }),
      supabase.from("blog_categories").select("*").order("name"),
    ]);
    setPosts((p ?? []) as BlogPost[]);
    setCategories((c ?? []) as BlogCategory[]);
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>Acceso solo para administradores.</p>
        <Button onClick={() => navigate("/")}>Volver</Button>
      </div>
    );
  }
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;

  async function savePost() {
    if (!editing?.title || !editing.content) {
      toast.error("Título y contenido son requeridos");
      return;
    }
    setSaving(true);
    const payload = {
      title: editing.title,
      slug: editing.slug || slugify(editing.title),
      excerpt: editing.excerpt ?? null,
      content: editing.content,
      cover_image_url: editing.cover_image_url ?? null,
      category_id: editing.category_id ?? null,
      meta_title: editing.meta_title ?? null,
      meta_description: editing.meta_description ?? null,
      reading_minutes: editing.reading_minutes ?? null,
      published: editing.published ?? false,
      published_at: editing.published && !editing.published_at ? new Date().toISOString() : editing.published_at ?? null,
      author_id: user!.id,
    };
    const { error } = editing.id
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Artículo actualizado" : "Artículo creado");
    setEditing(null);
    void reload();
  }

  async function deletePost(id: string) {
    if (!confirm("¿Eliminar este artículo?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    void reload();
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    const { error } = await supabase.from("blog_categories").insert({
      name: newCategory.trim(),
      slug: slugify(newCategory),
    });
    if (error) { toast.error(error.message); return; }
    setNewCategory("");
    void reload();
  }

  async function deleteCategory(id: string) {
    if (!confirm("¿Eliminar categoría? Los artículos quedarán sin categoría.")) return;
    const { error } = await supabase.from("blog_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void reload();
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Admin Blog | Trado</title><meta name="robots" content="noindex" /></Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <h1 className="font-bold">Blog</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>{editing.id ? "Editar artículo" : "Nuevo artículo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder={editing.title ? slugify(editing.title) : "mi-articulo"}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={editing.category_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resumen (excerpt)</Label>
                <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
              </div>
              <div>
                <Label>Contenido (Markdown)</Label>
                <Textarea rows={16} className="font-mono text-sm" value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meta título (SEO)</Label>
                  <Input value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                </div>
                <div>
                  <Label>Minutos de lectura</Label>
                  <Input type="number" value={editing.reading_minutes ?? ""} onChange={(e) => setEditing({ ...editing, reading_minutes: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <Label>Meta descripción (SEO, &lt;160 caract.)</Label>
                <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
              </div>
              <div>
                <Label>Imagen de portada (URL)</Label>
                <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                <Label>Publicado</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={savePost} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Artículos</h2>
                <Button onClick={() => setEditing({ published: false })}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
              </div>
              <div className="space-y-2">
                {posts.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={p.published ? "default" : "secondary"}>{p.published ? "Publicado" : "Borrador"}</Badge>
                          {p.category && <Badge variant="outline">{p.category.name}</Badge>}
                        </div>
                        <p className="font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">/blog/{p.slug}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Categorías</h2>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">/blog/categoria/{c.slug}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
