import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, type BlogPost as TPost } from "@/lib/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<TPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPostBySlug(slug).then((p) => setPost(p)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Artículo no encontrado</h1>
        <Button asChild><Link to="/blog">Volver al blog</Link></Button>
      </div>
    );
  }

  const canonical = `https://trado.cl/blog/${post.slug}`;
  const title = post.meta_title ?? `${post.title} | Blog Trado`;
  const description = post.meta_description ?? post.excerpt ?? "";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "Trado" },
    publisher: {
      "@type": "Organization",
      name: "Trado",
      logo: { "@type": "ImageObject", url: "https://trado.cl/icon-512.png" },
    },
    mainEntityOfPage: canonical,
    image: post.cover_image_url ?? "https://trado.cl/og-image.png",
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Blog
          </Link>
          <Link to="/" className="font-bold">Trado</Link>
        </div>
      </header>

      <article className="container mx-auto px-4 py-10 max-w-3xl">
        {post.category && (
          <Link to={`/blog/categoria/${post.category.slug}`}>
            <Badge variant="secondary" className="mb-4">{post.category.name}</Badge>
          </Link>
        )}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>}
        <div className="text-sm text-muted-foreground mb-10 flex gap-3">
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
            </time>
          )}
          {post.reading_minutes && <span>· {post.reading_minutes} min de lectura</span>}
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} className="w-full rounded-lg mb-10" />
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-16 p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-bold mb-2">¿Vas a comprar o vender en Chile?</h2>
          <p className="text-muted-foreground mb-4">Protege tu dinero con escrow P2P. El pago queda retenido hasta confirmar la entrega.</p>
          <Button asChild><Link to="/auth">Crear cuenta gratis</Link></Button>
        </div>
      </article>
    </div>
  );
}
