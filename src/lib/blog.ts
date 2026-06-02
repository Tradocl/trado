import { supabase } from "@/integrations/supabase/client";

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: string | null;
  author_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  reading_minutes: number | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: BlogCategory | null;
}

export async function listPublishedPosts(categorySlug?: string) {
  let query = supabase
    .from("blog_posts")
    .select("*, category:blog_categories(*)")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (categorySlug) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function getPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, category:blog_categories(*)")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as BlogPost | null;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BlogCategory[];
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as BlogCategory | null;
}
