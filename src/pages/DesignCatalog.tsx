import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import { ArrowRight, Check, Image, Palette, LayoutGrid, FileText, Mail, Presentation, Gift, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const categoryIcons: Record<string, React.ElementType> = {
  'cat-social-media': Image,
  'cat-stationery': LayoutGrid,
  'cat-marketing': FileText,
  'cat-brand': Palette,
  'artes-redes-sociais': Image,
  'kit-papelaria': LayoutGrid,
  'cartao-visita': FileText,
  'papel-timbrado': FileText,
  'envelope': Mail,
  'banner-digital': Image,
  'assinatura-email': Mail,
  'cardapio-digital': FileText,
  'apresentacao': Presentation,
  'convite-digital': Gift,
  'ebook': BookOpen,
};

interface DesignCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

interface DesignPackage {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  includes: string[] | null;
  estimated_days: number | null;
  is_active: boolean;
  is_bundle: boolean;
  display_order: number;
}

export default function DesignCatalog() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['design-categories-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_service_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as DesignCategory[];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['design-packages-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as DesignPackage[];
    },
  });

  const handleOrderClick = () => {
    if (user) {
      navigate('/design/checkout');
    } else {
      navigate('/cadastro?redirect=/design/checkout');
    }
  };

  const getPackagesByCategory = (categoryId: string) => {
    return packages?.filter(p => p.category_id === categoryId) || [];
  };

  return (
    <>
      <SEOHead
        pageKey="design"
        fallbackTitle="Design Digital | WebQ - Criativos Profissionais"
        fallbackDescription="Serviços de design digital: artes para redes sociais, papelaria, banners, apresentações e mais. Crie sua conta e compre quando precisar."
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section 
          className="relative py-16 md:py-24 overflow-hidden"
          style={{
            backgroundImage: 'url(/images/hero-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-background/85" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Sem necessidade de plano de hospedagem
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-foreground">
                Design Digital Profissional
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Criativos de alta qualidade para sua marca. Compre apenas o que precisar, 
                sem mensalidades ou compromissos.
              </p>
              <Button 
                size="xl" 
                variant="hero" 
                onClick={handleOrderClick}
              >
                {user ? "Fazer Novo Pedido" : "Criar Conta e Comprar"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Categories and Packages */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            {loadingCategories ? (
              <div className="space-y-8">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-[300px] w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-16">
                {categories?.map((category) => {
                  const categoryPackages = getPackagesByCategory(category.id);
                  if (categoryPackages.length === 0) return null;
                  
                  const IconComponent = categoryIcons[category.id] || Palette;
                  
                  return (
                    <div key={category.id} id={category.id}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                            {category.name}
                          </h2>
                          {category.description && (
                            <p className="text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryPackages.map((pkg) => (
                          <Card 
                            key={pkg.id}
                            className="flex flex-col border-border hover:border-primary/50 hover:shadow-lg transition-all"
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                  {pkg.description && (
                                    <CardDescription className="mt-1">{pkg.description}</CardDescription>
                                  )}
                                </div>
                                {pkg.is_bundle && (
                                  <Badge variant="secondary" className="shrink-0">Kit</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                              <p className="text-3xl font-bold text-primary mb-2">
                                R$ {Number(pkg.price).toFixed(0)}
                              </p>
                              {pkg.estimated_days && (
                                <p className="text-sm text-muted-foreground mb-4">
                                  Prazo: ~{pkg.estimated_days} dias úteis
                                </p>
                              )}
                              
                              {pkg.includes && pkg.includes.length > 0 && (
                                <ul className="space-y-2 mb-4 flex-1">
                                  {pkg.includes.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <Button 
                                className="w-full mt-auto" 
                                onClick={() => navigate(`/design/checkout?package=${pkg.id}`)}
                              >
                                Comprar
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Pronto para elevar sua marca?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Crie sua conta gratuitamente e faça seu primeiro pedido de design hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={handleOrderClick}
              >
                {user ? "Fazer Pedido Agora" : "Criar Conta Grátis"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!user && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  onClick={() => navigate('/cliente')}
                >
                  Já tenho conta
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
