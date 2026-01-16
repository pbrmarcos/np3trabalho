import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import HelpSidebar from "@/components/help/HelpSidebar";
import HelpTableOfContents from "@/components/help/HelpTableOfContents";
import HelpArticleFeedback from "@/components/help/HelpArticleFeedback";
import { ChevronRight, ChevronLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

export default function HelpArticle() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ["help-articles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, slug, category_id, display_order")
        .eq("is_published", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const currentCategory = categories.find((c) => c.slug === categorySlug);

  const { data: article } = useQuery({
    queryKey: ["help-article", articleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("slug", articleSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const incrementViewMutation = useMutation({
    mutationFn: async (id: string) => {
      // Simple view count increment
      const { data } = await supabase
        .from("help_articles")
        .select("view_count")
        .eq("id", id)
        .single();
      if (data) {
        await supabase
          .from("help_articles")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", id);
      }
    },
  });

  useEffect(() => {
    if (article?.id) {
      incrementViewMutation.mutate(article.id);
    }
  }, [article?.id]);

  // Get adjacent articles for navigation
  const categoryArticles = allArticles.filter((a) => a.category_id === currentCategory?.id);
  const currentIndex = categoryArticles.findIndex((a) => a.slug === articleSlug);
  const prevArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : null;

  if (!article || !currentCategory) {
    return (
      <main className="min-h-screen pt-32 pb-16">
        <div className="container text-center">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <Link to="/ajuda" className="text-primary hover:underline">
            Voltar para Central de Ajuda
          </Link>
        </div>
      </main>
    );
  }

  // Add IDs to headings for TOC
  const processedContent = article.content.replace(
    /<(h[23])([^>]*)>([^<]+)<\/h[23]>/gi,
    (match: string, tag: string, attrs: string, text: string) => {
      const id = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
    }
  );

  const seoTitle = article.og_title || article.title;
  const seoDescription = article.meta_description || article.excerpt || article.title;

  return (
    <>
      <Helmet>
        <title>{seoTitle} - Central de Ajuda | WebQ</title>
        <meta name="description" content={seoDescription} />
        {article.keywords && <meta name="keywords" content={article.keywords} />}
        <meta property="og:title" content={article.og_title || seoTitle} />
        <meta property="og:description" content={article.og_description || seoDescription} />
        {article.og_image && <meta property="og:image" content={article.og_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.og_title || seoTitle} />
        <meta name="twitter:description" content={article.og_description || seoDescription} />
        {article.og_image && <meta name="twitter:image" content={article.og_image} />}
      </Helmet>

      <main className="min-h-screen pt-24">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container py-4">
            <nav className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/ajuda" className="text-muted-foreground hover:text-foreground">
                Ajuda
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link
                to={`/ajuda/${categorySlug}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {currentCategory.name}
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{article.title}</span>
            </nav>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex gap-8 items-start">
            {/* Mobile sidebar toggle */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden fixed bottom-4 right-4 z-50 shadow-lg"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            {/* Sidebar */}
            <aside
              className={cn(
                "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-background border-r lg:border-0 p-4 lg:p-0 transform transition-transform lg:transform-none overflow-y-auto",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              )}
              style={{ top: "4rem" }}
            >
              <div className="lg:sticky lg:top-28">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Categorias
                </h3>
                <HelpSidebar categories={categories} articles={allArticles} />
              </div>
            </aside>

            {/* Backdrop */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-background/80 z-30 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Content */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <h1 className="text-3xl font-bold mb-6">{article.title}</h1>

              <div
                className="help-content prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent) }}
              />

              {/* Feedback */}
              <div className="mt-10">
                <HelpArticleFeedback articleId={article.id} />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-8 border-t gap-4">
                {prevArticle ? (
                  <Link
                    to={`/ajuda/${categorySlug}/${prevArticle.slug}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="truncate">{prevArticle.title}</span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextArticle && (
                  <Link
                    to={`/ajuda/${categorySlug}/${nextArticle.slug}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group text-right"
                  >
                    <span className="truncate">{nextArticle.title}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </article>

            {/* Table of Contents */}
            <aside className="hidden xl:block w-56 shrink-0">
              <div className="sticky top-24">
                <HelpTableOfContents content={processedContent} />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
