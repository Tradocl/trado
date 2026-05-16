// Runs before vite dev/build (predev/prebuild). Writes public/sitemap.xml
// including dynamic blog posts and categories pulled from Supabase.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://trado.cl";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://uohlyccjugbqsxiwerrv.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaGx5Y2NqdWdicXN4aXdlcnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzQ2NTgsImV4cCI6MjA3OTc1MDY1OH0.Jq2sYcV1LcQHAZV1pUY_-W69LYYO4Xm7bCBKM_zF_Zs";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().split("T")[0];

const staticEntries: SitemapEntry[] = [
  { path: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
  { path: "/blog", lastmod: today, changefreq: "weekly", priority: "0.9" },
  { path: "/auth", lastmod: today, changefreq: "monthly", priority: "0.8" },
  { path: "/terms", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/reset-password", lastmod: today, changefreq: "yearly", priority: "0.3" },
  { path: "/verificar-email", lastmod: today, changefreq: "yearly", priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const [{ data: posts }, { data: categories }] = await Promise.all([
      supabase.from("blog_posts").select("slug, updated_at, published_at").eq("published", true),
      supabase.from("blog_categories").select("slug, updated_at"),
    ]);
    const postEntries: SitemapEntry[] = (posts ?? []).map((p: any) => ({
      path: `/blog/${p.slug}`,
      lastmod: (p.updated_at ?? p.published_at ?? new Date().toISOString()).split("T")[0],
      changefreq: "monthly",
      priority: "0.7",
    }));
    const catEntries: SitemapEntry[] = (categories ?? []).map((c: any) => ({
      path: `/blog/categoria/${c.slug}`,
      lastmod: (c.updated_at ?? new Date().toISOString()).split("T")[0],
      changefreq: "weekly",
      priority: "0.6",
    }));
    return [...catEntries, ...postEntries];
  } catch (err) {
    console.warn("[sitemap] could not fetch dynamic entries:", err);
    return [];
  }
}

function build(entries: SitemapEntry[]) {
  const urls = entries.map((e) => [
    "  <url>",
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n"));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

const dynamic = await fetchDynamicEntries();
const all = [...staticEntries, ...dynamic];
writeFileSync(resolve("public/sitemap.xml"), build(all));
console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${dynamic.length} dynamic)`);
