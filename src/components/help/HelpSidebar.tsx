import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Rocket, Mail, Globe, CreditCard, Palette, ArrowRightLeft, HelpCircle, LucideIcon } from "lucide-react";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category_id: string;
}

interface HelpSidebarProps {
  categories: Category[];
  articles: Article[];
  className?: string;
}

// Map icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  mail: Mail,
  globe: Globe,
  "credit-card": CreditCard,
  palette: Palette,
  "arrow-right-left": ArrowRightLeft,
  help: HelpCircle,
};

const getIconForCategory = (slug: string): LucideIcon => {
  const slugIconMap: Record<string, LucideIcon> = {
    "primeiros-passos": Rocket,
    "emails-profissionais": Mail,
    "dominio-hospedagem": Globe,
    "pagamentos-assinatura": CreditCard,
    "design-digital": Palette,
    "migracao-sites": ArrowRightLeft,
  };
  return slugIconMap[slug] || HelpCircle;
};

export default function HelpSidebar({ categories, articles, className }: HelpSidebarProps) {
  const { categorySlug, articleSlug } = useParams();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categorySlug ? [categorySlug] : []
  );

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const getArticlesForCategory = (categoryId: string) => {
    return articles.filter((a) => a.category_id === categoryId);
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {categories.map((category) => {
        const categoryArticles = getArticlesForCategory(category.id);
        const isExpanded = expandedCategories.includes(category.slug);
        const isActiveCategory = categorySlug === category.slug;
        const IconComponent = getIconForCategory(category.slug);

        return (
          <div key={category.id}>
            <button
              onClick={() => toggleCategory(category.slug)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActiveCategory
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <IconComponent 
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActiveCategory 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                  )} 
                />
                {category.name}
              </span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90"
                )} 
              />
            </button>

            <div 
              className={cn(
                "overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              {categoryArticles.length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                  {categoryArticles.map((article) => {
                    const isActiveArticle = articleSlug === article.slug;
                    return (
                      <Link
                        key={article.id}
                        to={`/ajuda/${category.slug}/${article.slug}`}
                        className={cn(
                          "block px-3 py-1.5 rounded text-sm transition-all duration-200",
                          isActiveArticle
                            ? "bg-primary/10 text-primary font-medium translate-x-1"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:translate-x-1"
                        )}
                      >
                        {article.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
