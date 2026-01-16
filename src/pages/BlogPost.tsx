import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowLeft, Clock, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, meta_description, keywords, og_title, og_description, og_image, is_isolated_page")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error) throw error;
      
      // If this is an isolated page, redirect to root URL
      if (data?.is_isolated_page) {
        navigate(`/${slug}`, { replace: true });
        return null;
      }
      
      return data;
    },
    enabled: !!slug,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  // Calculate reading time (average 200 words per minute)
  const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
  };

  if (isLoading) {
    return (
      <div className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container px-4 md:px-6 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-8 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container px-4 md:px-6 max-w-4xl text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Artigo não encontrado
          </h1>
          <p className="text-muted-foreground mb-6">
            O artigo que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate("/blog")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Blog
          </Button>
        </div>
      </div>
    );
  }

  const readingTime = calculateReadingTime(post.content);

  // SEO fields with fallbacks
  const seoTitle = post.title;
  const seoDescription = post.meta_description || post.excerpt || post.title;
  const seoKeywords = post.keywords;
  const ogTitle = post.og_title || post.title;
  const ogDescription = post.og_description || post.meta_description || post.excerpt || post.title;
  const ogImage = post.og_image || post.cover_image;

  return (
    <>
      <Helmet>
        <title>{seoTitle} | WebQ Blog</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://webq.com.br/blog/${post.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <link rel="canonical" href={`https://webq.com.br/blog/${post.slug}`} />
      </Helmet>
      <article className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container px-4 md:px-6 max-w-4xl">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            {post.title}
          </h1>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(
                new Date(post.published_at || post.created_at),
                "d 'de' MMMM, yyyy",
                { locale: ptBR }
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readingTime} min de leitura
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>

          {/* Excerpt/Summary */}
          {post.excerpt && (
            <p className="mt-6 text-lg italic text-muted-foreground leading-relaxed border-l-4 border-primary/30 pl-4">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="relative mb-10 rounded-xl overflow-hidden">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div 
          className="blog-content prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
            prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-6
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:text-muted-foreground prose-ol:text-muted-foreground prose-ul:my-6 prose-ol:my-6
            prose-li:my-2 prose-li:leading-relaxed
            prose-img:rounded-xl prose-img:my-8
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:my-8
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:border-border"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
        />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver todos os artigos
            </Link>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar artigo
            </Button>
          </div>
        </footer>
        </div>
      </article>
    </>
  );
}
