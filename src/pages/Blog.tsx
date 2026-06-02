import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { listPublishedPosts, listCategories, getCategoryBySlug, type BlogPost, type BlogCategory } from "@/lib/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Blog() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [currentCategory, setCurrentCategory] = useState<BlogCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      listPublishedPosts(categorySlug),
      listCategories(),
      categorySlug ? getCategoryBySlug(categorySlug) : Promise.resolve(null),
    ])
      .then(([p, c, cat]) => {
        if (!active) return;
        setPosts(p);
        setCategories(c);
        setCurrentCategory(cat);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [categorySlug]);

  const title = currentCategory
    ? `${currentCategory.name} | Blog Trado`
    : "Blog Trado — Escrow P2P y compras seguras en Chile";
  const description = currentCategory?.description
    ?? "Guías, consejos y noticias sobre compra segura, escrow entre particulares y prevención de estafas en Chile.";
  const canonical = currentCategory
    ? `https://trado.cl/blog/categoria/${currentCategory.slug}`
    : "https://trado.cl/blog";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver a Trado
          </Link>
          <Link to="/blog" className="font-bold text-lg">Blog Trado</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {currentCategory?.name ?? "Compra y vende seguro en Chile"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {currentCategory?.description ?? "Guías prácticas sobre escrow P2P, prevención de estafas y mejores prácticas para comprar y vender entre particulares en Chile."}
          </p>
        </section>

        <nav className="flex flex-wrap gap-2 mb-10" aria-label="Categorías">
          <Button
            asChild
            variant={!categorySlug ? "default" : "outline"}
            size="sm"
          >
            <Link to="/blog">Todos</Link>
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              asChild
              variant={categorySlug === c.slug ? "default" : "outline"}
              size="sm"
            >
              <Link to={`/blog/categoria/${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
        </nav>

        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Aún no hay artículos en esta categoría.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group">
                <Card className="h-full transition-all group-hover:border-primary group-hover:shadow-lg">
                  <CardHeader>
                    {p.category && (
                      <Badge variant="secondary" className="w-fit mb-2">{p.category.name}</Badge>
                    )}
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {p.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3">{p.excerpt}</p>
                    {p.reading_minutes && (
                      <p className="text-xs text-muted-foreground mt-3">{p.reading_minutes} min de lectura</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
