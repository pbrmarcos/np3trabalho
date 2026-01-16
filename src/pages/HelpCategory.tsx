import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import HelpSidebar from "@/components/help/HelpSidebar";
import { ChevronRight, FileText, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HelpCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
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

  const { data: categoryArticles = [] } = useQuery({
    queryKey: ["help-articles-category", currentCategory?.id],
    queryFn: async () => {
      if (!currentCategory) return [];
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("category_id", currentCategory.id)
        .eq("is_published", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!currentCategory,
  });

  if (!currentCategory) {
    return (
      <main className="min-h-screen pt-32 pb-16">
        <div className="container text-center">
          <h1 className="text-2xl font-bold mb-4">Categoria não encontrada</h1>
          <Link to="/ajuda" className="text-primary hover:underline">
            Voltar para Central de Ajuda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>{currentCategory.name} - Central de Ajuda | WebQ</title>
        <meta name="description" content={currentCategory.description || `Artigos sobre ${currentCategory.name}`} />
      </Helmet>

      <main className="min-h-screen pt-24">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/ajuda" className="text-muted-foreground hover:text-foreground">
                Ajuda
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{currentCategory.name}</span>
            </nav>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex gap-8">
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
                "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-background border-r lg:border-0 p-4 lg:p-0 transform transition-transform lg:transform-none",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              )}
              style={{ top: "4rem" }}
            >
              <div className="lg:sticky lg:top-24">
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
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2">{currentCategory.name}</h1>
              {currentCategory.description && (
                <p className="text-muted-foreground mb-8">{currentCategory.description}</p>
              )}

              {categoryArticles.length === 0 ? (
                <p className="text-muted-foreground">Nenhum artigo nesta categoria ainda.</p>
              ) : (
                <div className="grid gap-3">
                  {categoryArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={`/ajuda/${categorySlug}/${article.slug}`}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
