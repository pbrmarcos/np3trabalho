import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Palette, LayoutGrid, FileText, Presentation, Sparkles, Star, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseGradientText } from "@/lib/textUtils";

const categoryIcons: Record<string, React.ElementType> = {
  'cat-brand': Palette,
  'cat-papelaria': LayoutGrid,
  'cat-marketing': FileText,
  'cat-apresentacoes': Presentation,
};

interface DesignCategory {
  id: string;
  name: string;
  min_price: number | null;
}

interface DesignPackage {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
}

interface DesignServicesContent {
  title: string;
  subtitle: string;
  cta_text: string;
  catalog_button: string;
}

interface DesignServicesShowcaseProps {
  showTitle?: boolean;
  content?: DesignServicesContent;
}

const defaultContent: DesignServicesContent = {
  title: 'Design Digital Profissional',
  subtitle: 'Não precisa de hospedagem? Compre apenas os serviços de design! Crie sua conta e peça seus criativos quando precisar.',
  cta_text: 'Não tem conta ainda? Cadastre-se gratuitamente para comprar serviços de design.',
  catalog_button: 'Ver Catálogo Completo',
};

export default function DesignServicesShowcase({ 
  showTitle = true,
  content = defaultContent
}: DesignServicesShowcaseProps) {
  const navigate = useNavigate();

  // Fetch social media packages specifically
  const { data: socialMediaPackages, isLoading: loadingSocial } = useQuery({
    queryKey: ['social-media-packages-homepage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_packages')
        .select('id, name, price, description, category_id')
        .eq('is_active', true)
        .eq('category_id', 'cat-social')
        .order('price');
      
      if (error) throw error;
      return (data || []) as DesignPackage[];
    },
  });

  // Fetch min prices for other categories
  const { data: categoryPrices } = useQuery({
    queryKey: ['category-min-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_packages')
        .select('category_id, price')
        .eq('is_active', true)
        .neq('category_id', 'cat-social');
      
      if (error) throw error;
      
      // Group by category and get min price
      const minPrices: Record<string, number> = {};
      (data || []).forEach((pkg) => {
        if (!minPrices[pkg.category_id] || pkg.price < minPrices[pkg.category_id]) {
          minPrices[pkg.category_id] = pkg.price;
        }
      });
      return minPrices;
    },
  });

  // Get other categories (excluding social)
  const { data: otherCategories } = useQuery({
    queryKey: ['other-design-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_service_categories')
        .select('id, name')
        .eq('is_active', true)
        .neq('id', 'cat-social')
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const isLoading = loadingSocial;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Extract package quantities from name
  const getPackageQuantity = (name: string): string => {
    const match = name.match(/(\d+)/);
    return match ? match[1] : '';
  };

  return (
    <div className="space-y-8">
      {showTitle && (
        <div className="text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Serviços de Design
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-display-md font-display text-foreground mb-3">
            {parseGradientText(content.title)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {parseGradientText(content.subtitle)}
          </p>
          
          {/* Made by Humans Badge - Mobile version */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex lg:hidden justify-center mt-5 opacity-0 animate-fade-in [animation-delay:3s] [animation-fill-mode:forwards]">
                  <div className="relative flex flex-col gap-0.5 px-4 py-3 rounded-lg bg-[hsl(0,75%,55%)] text-white font-black uppercase tracking-wide shadow-lg shadow-red-500/30 rotate-3 transition-transform duration-200 hover:scale-110 cursor-help select-none">
                    <Info className="absolute -top-2 -right-2 h-5 w-5 bg-white text-[hsl(0,75%,55%)] rounded-full p-0.5" />
                    <span className="text-sm leading-tight">Design Made by</span>
                    <span className="text-lg leading-tight border-t border-white/30 pt-1">Humans</span>
                    <span className="text-[10px] leading-tight border-t border-white/30 pt-1 tracking-widest">No AI Used</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-center">
                <p>Todos os nossos designs são criados 100% por designers humanos profissionais. Não utilizamos inteligência artificial na criação dos criativos.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Made by Humans Badge - Desktop version */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col items-center opacity-0 animate-fade-in [animation-delay:3s] [animation-fill-mode:forwards]">
                  <div className="relative flex flex-col gap-0.5 px-4 py-3 rounded-lg bg-[hsl(0,75%,55%)] text-white font-black uppercase tracking-wide shadow-lg shadow-red-500/30 rotate-6 transition-transform duration-200 hover:scale-110 cursor-help select-none">
                    <Info className="absolute -top-2 -right-2 h-5 w-5 bg-white text-[hsl(0,75%,55%)] rounded-full p-0.5" />
                    <span className="text-sm leading-tight">Design Made by</span>
                    <span className="text-lg leading-tight border-t border-white/30 pt-1">Humans</span>
                    <span className="text-[10px] leading-tight border-t border-white/30 pt-1 tracking-widest">No AI Used</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[280px] text-center">
                <p>Todos os nossos designs são criados 100% por designers humanos profissionais. Não utilizamos inteligência artificial na criação dos criativos.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Featured: Social Media Packages - 3 distinct packages */}
      {socialMediaPackages && socialMediaPackages.length > 0 && (
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 md:p-8 border border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">Em Destaque</Badge>
              <h3 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                Criativos para Redes Sociais
              </h3>
              <p className="text-muted-foreground mt-1">
                3 pacotes distintos para Instagram, Facebook, LinkedIn e mais
              </p>
            </div>
            <Button onClick={() => navigate('/design')} variant="outline" className="shrink-0">
              Ver detalhes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {socialMediaPackages.map((pkg, index) => {
              const quantity = getPackageQuantity(pkg.name);
              const isPopular = index === 1; // Middle package is most popular
              
              return (
                <Card 
                  key={pkg.id} 
                  className={`relative border-border/50 bg-card/80 backdrop-blur hover:border-primary/30 transition-all cursor-pointer ${
                    isPopular ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
                  }`}
                  onClick={() => navigate(`/design/checkout?package=${pkg.id}`)}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-md">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {quantity}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      artes personalizadas
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-2">
                      R$ {Number(pkg.price).toFixed(0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Categories - Symmetrical 4-column grid */}
      {otherCategories && otherCategories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Outros Serviços de Design
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherCategories.slice(0, 4).map((category) => {
              const IconComponent = categoryIcons[category.id] || Palette;
              const minPrice = categoryPrices?.[category.id];
              
              return (
                <Card 
                  key={category.id}
                  className="border-border hover:border-primary/30 transition-all cursor-pointer group hover:shadow-md"
                  onClick={() => navigate(`/design?categoria=${category.id}`)}
                >
                  <CardContent className="p-5 text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">
                      {category.name}
                    </p>
                    {minPrice && (
                      <p className="text-xs text-muted-foreground">
                        A partir de <span className="font-semibold text-primary">R$ {Number(minPrice).toFixed(0)}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center pt-4">
        <p className="text-muted-foreground mb-4">
          {content.cta_text}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/cadastro')} size="lg">
            Criar Conta Grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/design')} variant="outline" size="lg">
            {content.catalog_button}
          </Button>
        </div>
      </div>
    </div>
  );
}
