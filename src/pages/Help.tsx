import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import HelpSearch from "@/components/help/HelpSearch";
import { Rocket, Mail, Globe, CreditCard, Shield, HelpCircle, BookOpen, Settings, Users, FileText, ChevronRight, Palette, RefreshCw, MessageSquare } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket, Mail, Globe, CreditCard, Shield, HelpCircle, BookOpen, Settings, Users, FileText, Palette, RefreshCw, MessageSquare,
};

export default function Help() {
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

  const { data: articles = [] } = useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select(`
          id, title, slug, excerpt, category_id, view_count,
          help_categories!inner(slug, name)
        `)
        .eq("is_published", true)
        .order("view_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data.map((a: any) => ({
        ...a,
        category_slug: a.help_categories?.slug,
        category_name: a.help_categories?.name,
      }));
    },
  });

  const { data: articleCounts = {} } = useQuery({
    queryKey: ["help-article-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("category_id")
        .eq("is_published", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a) => {
        counts[a.category_id] = (counts[a.category_id] || 0) + 1;
      });
      return counts;
    },
  });

  const searchArticles = articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category_slug: a.category_slug || "",
    category_name: a.category_name || "",
  }));

  return (
    <>
      <SEOHead
        pageKey="help"
        fallbackTitle="Central de Ajuda | WebQ"
        fallbackDescription="Encontre tutoriais, guias e respostas para suas dúvidas sobre os serviços WebQ."
      />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background pt-32 pb-16">
          <div className="container max-w-3xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Central de Ajuda</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Como podemos ajudar você hoje?
            </p>
            <HelpSearch articles={searchArticles} className="max-w-xl mx-auto" />
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-xl font-semibold mb-8">Categorias</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const IconComponent = ICONS[category.icon || "HelpCircle"] || HelpCircle;
                const count = articleCounts[category.id] || 0;
                return (
                  <Link
                    key={category.id}
                    to={`/ajuda/${category.slug}`}
                    className="group p-6 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "artigo" : "artigos"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Articles */}
        {articles.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="container">
              <h2 className="text-xl font-semibold mb-8">Artigos Populares</h2>
              <div className="grid gap-3 max-w-2xl">
                {articles.slice(0, 5).map((article) => (
                  <Link
                    key={article.id}
                    to={`/ajuda/${article.category_slug}/${article.slug}`}
                    className="flex items-center gap-3 p-4 bg-background border rounded-lg hover:border-primary/50 transition-colors group"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {article.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{article.category_name}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
