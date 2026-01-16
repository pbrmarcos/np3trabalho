import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet";

export default function IsolatedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["isolated-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_isolated_page", true)
        .eq("published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container px-4 md:px-6 max-w-4xl">
          <Skeleton className="h-12 w-full mb-4" />
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

  // If not found as isolated page, return null to let App.tsx handle 404
  if (error || !page) {
    return null;
  }

  // SEO fields with fallbacks
  const seoTitle = page.title;
  const seoDescription = page.meta_description || page.excerpt || page.title;
  const seoKeywords = page.keywords;
  const ogTitle = page.og_title || page.title;
  const ogDescription = page.og_description || page.meta_description || page.excerpt || page.title;
  const ogImage = page.og_image || page.cover_image;

  return (
    <>
      <Helmet>
        <title>{seoTitle} | WebQ</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://webq.com.br/${page.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <link rel="canonical" href={`https://webq.com.br/${page.slug}`} />
      </Helmet>
      <article className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container px-4 md:px-6 max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {page.title}
            </h1>
          </header>

          {/* Cover Image */}
          {page.cover_image && (
            <div className="relative mb-10 rounded-xl overflow-hidden">
              <img
                src={page.cover_image}
                alt={page.title}
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
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}
          />
        </div>
      </article>
    </>
  );
}
