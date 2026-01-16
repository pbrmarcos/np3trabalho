import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight, Server, Smartphone, BarChart3, Code, Zap, ShieldCheck, Loader2, Image, Palette, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { parseGradientText } from "@/lib/textUtils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import PortfolioShowcase from "@/components/PortfolioShowcase";

import HomeBlogCarousel from "@/components/HomeBlogCarousel";
import HomeFAQSection from "@/components/HomeFAQSection";
import MigrationSection from "@/components/MigrationSection";
import DesignServicesShowcase from "@/components/DesignServicesShowcase";
import { useParallax } from "@/hooks/useParallax";

interface PlanConfig {
  name: string;
  price: number;
  price_id: string;
  product_id: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface HeroContent {
  title: string;
  subtitle: string;
  cta_primary: string;
  cta_secondary: string;
}

interface CtaContent {
  title: string;
  subtitle: string;
  button_text: string;
}

interface ServicesContent {
  title: string;
  subtitle: string;
}

interface PlansContent {
  title: string;
  subtitle: string;
  cta_button: string;
  compare_link: string;
}

interface DesignServicesContent {
  title: string;
  subtitle: string;
  cta_text: string;
  catalog_button: string;
}

export default function Index() {
  const navigate = useNavigate();
  const parallaxOffset = useParallax({ speed: 0.4, maxOffset: 300 });
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settingsMap: Record<string, any> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });
      return settingsMap;
    },
  });

  const plans: Array<PlanConfig & { featured: boolean }> = (settings?.plan_basic && settings?.plan_professional && settings?.plan_performance) ? [
    { ...(settings.plan_basic as PlanConfig), featured: false },
    { ...(settings.plan_professional as PlanConfig), featured: true },
    { ...(settings.plan_performance as PlanConfig), featured: false },
  ] : defaultPlans;

  const heroContent = (settings?.hero_content as HeroContent) || defaultHeroContent;
  const ctaContent = (settings?.cta_content as CtaContent) || defaultCtaContent;
  const servicesContent = (settings?.services_content as ServicesContent) || defaultServicesContent;
  const plansContent = (settings?.plans_content as PlansContent) || defaultPlansContent;
  const designServicesContent = (settings?.design_services_content as DesignServicesContent) || defaultDesignServicesContent;

  return (
    <>
      <SEOHead
        pageKey="homepage"
        fallbackTitle="WebQ - Sites Profissionais | Desenvolvimento Web Premium"
        fallbackDescription="Desenvolvemos sites profissionais de alta performance que convertem visitantes em clientes. Hospedagem, SSL e suporte inclusos. A partir de R$ 149/mês."
      />
      <div className="flex flex-col">
        {/* Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
        {/* Background with parallax and enhanced effects */}
        <div 
          className="absolute inset-0 z-0 will-change-transform"
          style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
        >
          {/* Gradient mesh background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div 
            className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 will-change-transform" 
            style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
          />
          <div 
            className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 will-change-transform" 
            style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
          />
          
          {/* Background image with overlay and parallax */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background z-10" />
          <img
            src="/images/hero-bg.png"
            alt="Background"
            className="w-full h-full object-cover opacity-30 will-change-transform"
            style={{ transform: `translateY(${parallaxOffset * 0.6}px) scale(1.1)` }}
          />
        </div>

        <div className="container relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-16 md:py-24">
          <div className="space-y-6 md:space-y-10">
            {/* Badge with glow effect */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs md:text-sm font-semibold animate-fade-in shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              Disponível para novos projetos
            </div>

            {/* Headline with enhanced typography */}
            <h1 className="text-4xl sm:text-5xl md:text-display-lg lg:text-display-xl font-display text-foreground animate-fade-in-up leading-[1.1] tracking-tight">
              {parseGradientText(heroContent.title)}
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              {heroContent.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up pt-2" style={{ animationDelay: "200ms" }}>
              <Button 
                size="lg" 
                className="font-semibold w-full sm:w-auto"
                onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {heroContent.cta_primary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver Planos
              </Button>
            </div>

            {/* Trust indicators with card style */}
            <div className="flex flex-wrap gap-3 pt-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-sm">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">SSL Grátis</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-sm">
                <Zap className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">Alta Performance</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-sm">
                <Server className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">Hospedagem Inclusa</span>
            </div>
            </div>
          </div>

          {/* Portfolio Showcase with enhanced container */}
          <div className="hidden lg:block animate-slide-in-right">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-2xl opacity-50" />
              <div className="relative">
                <PortfolioShowcase />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce hidden md:block">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-16 md:py-24 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-display-md font-display text-foreground mb-3 md:mb-4">
              {parseGradientText(servicesContent.title)}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {parseGradientText(servicesContent.subtitle)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {services.map((service, index) => (
              <Card
                key={service.title}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border bg-card"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="p-4 md:p-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-base md:text-lg">{service.title}</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    {service.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Migration Section */}
      <MigrationSection />

      {/* Pricing Section - Website Plans */}
      <section id="planos" className="py-16 md:py-24 bg-background">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-display-md font-display text-foreground mb-3 md:mb-4">
              {parseGradientText(plansContent.title)}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {parseGradientText(plansContent.subtitle)}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.featured || plan.popular
                      ? "border-primary shadow-primary md:scale-105 z-10"
                      : "border-border"
                  }`}
                >
                  {(plan.featured || plan.popular) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-foreground">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl md:text-display-sm text-foreground">
                        R$ {plan.price}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 md:p-6 pt-0 md:pt-0">
                    <ul className="space-y-2.5 md:space-y-3">
                      {(plan.features || []).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-4 md:p-6 pt-0 md:pt-0">
                    <Button
                      className="w-full"
                      variant={plan.featured || plan.popular ? "default" : "outline"}
                      onClick={() => {
                        const planKey = plan.name === "Essencial" ? "essencial" : 
                                       plan.name === "Profissional" ? "profissional" : "performance";
                        navigate(`/planos/checkout?plan=${planKey}`);
                      }}
                    >
                      {plansContent.cta_button}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Link para ver detalhes dos planos */}
          <div className="text-center mt-8 md:mt-12">
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 font-medium text-base gap-2"
              onClick={() => navigate("/planos")}
            >
              {plansContent.compare_link}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Design Services Section */}
      {(() => {
        const designConfig = settings?.design_services_config as { 
          background_image?: string; 
          enable_background?: boolean; 
          overlay_opacity?: number 
        } | undefined;
        const enableBg = designConfig?.enable_background ?? true;
        const bgImage = designConfig?.background_image || '/images/coding-workspace.png';
        const overlayOpacity = designConfig?.overlay_opacity ?? 75;

        return (
          <section 
            id="design" 
            className="py-16 md:py-24 relative overflow-hidden"
            style={enableBg ? {
              backgroundImage: `url('${bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
            } : undefined}
          >
            {/* Dark overlay for readability */}
            <div 
              className="absolute inset-0" 
              style={{ 
                backgroundColor: enableBg 
                  ? `hsl(var(--background) / ${Math.max(0, (overlayOpacity - 10)) / 100})` 
                  : 'hsl(var(--muted) / 0.3)' 
              }} 
            />
            
            <div className="container px-4 md:px-6 relative z-10">
              <DesignServicesShowcase content={designServicesContent} />
            </div>
          </section>
        );
      })()}

      {/* Blog Carousel Section */}
      <HomeBlogCarousel />

      {/* FAQ Section */}
      <HomeFAQSection />

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-display-md font-display mb-3 md:mb-4">
            {parseGradientText(ctaContent.title)}
          </h2>
          <p className="text-base md:text-xl opacity-90 max-w-2xl mx-auto mb-6 md:mb-8">
            {parseGradientText(ctaContent.subtitle)}
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="font-semibold w-full sm:w-auto"
            onClick={() => navigate('/planos')}
          >
            {ctaContent.button_text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        </section>
      </div>
    </>
  );
}

const services = [
  {
    icon: Code,
    title: "Desenvolvimento Web",
    description:
      "Sites responsivos e de alta performance com as tecnologias mais modernas do mercado.",
  },
  {
    icon: Smartphone,
    title: "Design Responsivo",
    description:
      "Interfaces adaptadas para todos os dispositivos, garantindo a melhor experiência ao usuário.",
  },
  {
    icon: Server,
    title: "Hospedagem Premium",
    description:
      "Infraestrutura robusta com SSL, CDN e backups automáticos inclusos em todos os planos.",
  },
  {
    icon: RefreshCw,
    title: "Migração de Sites",
    description:
      "Trazemos seu site existente para nossa infraestrutura com zero downtime.",
  },
  {
    icon: Image,
    title: "Criativos para Redes Sociais",
    description:
      "Artes profissionais para Instagram, Facebook, LinkedIn e mais.",
  },
  {
    icon: Palette,
    title: "Criação de Marca",
    description:
      "Identidade visual completa: logotipo, cores, tipografia e aplicações.",
  },
  {
    icon: BarChart3,
    title: "SEO & Analytics",
    description:
      "Otimização para mecanismos de busca e relatórios detalhados de performance.",
  },
  {
    icon: ShieldCheck,
    title: "Manutenção Contínua",
    description:
      "Atualizações de segurança, monitoramento 24/7 e suporte técnico especializado.",
  },
];

const defaultPlans = [
  {
    name: "Essencial",
    description: "Para quem está começando",
    price: 149,
    price_id: "",
    product_id: "",
    features: [
      "Site One-Page Responsivo",
      "Hospedagem Inclusa",
      "3 Contas de E-mail Profissional",
      "10 GB de armazenamento NVMe",
      "Certificado SSL Gratuito",
      "Suporte por E-mail",
    ],
    featured: false,
  },
  {
    name: "Profissional",
    description: "Para empresas em crescimento",
    price: 299,
    price_id: "",
    product_id: "",
    features: [
      "Site Multi-páginas (até 5)",
      "Hospedagem Premium",
      "5 Contas de E-mail",
      "20 GB de armazenamento NVMe",
      "Blog/Notícias Integrado",
      "Otimização SEO Avançada",
      "Suporte Prioritário via WhatsApp",
    ],
    featured: true,
  },
  {
    name: "Performance",
    description: "Para empresas que querem máxima velocidade e autoridade",
    price: 449,
    price_id: "",
    product_id: "",
    features: [
      "Site Multi-páginas (até 10)",
      "Blog/Notícias Integrado",
      "Infraestrutura Otimizada (CDN + Cache Avançado)",
      "SEO Técnico + Core Web Vitals",
      "E-mails Ilimitados",
      "50 GB de armazenamento NVMe",
      "Integração com Google Analytics + Tag Manager",
      "Landing Pages Ilimitadas",
      "Suporte Técnico Avançado",
      "Relatórios Mensais de Performance",
    ],
    featured: false,
  },
];

const defaultHeroContent = {
  title: "Sua empresa\n*precisa ser vista.*",
  subtitle: "Desenvolvemos sites profissionais de alta performance que convertem visitantes em clientes. Tecnologia de ponta, design premium e hospedagem inclusa.",
  cta_primary: "Falar com Especialista",
  cta_secondary: "Ver Portfólio",
};

const defaultCtaContent = {
  title: "Pronto para começar?",
  subtitle: "Entre em contato conosco e transforme sua presença digital hoje mesmo.",
  button_text: "Falar com Especialista",
};

const defaultServicesContent = {
  title: "Nossos Serviços",
  subtitle: "Soluções completas para sua presença digital, do desenvolvimento à manutenção contínua.",
};

const defaultPlansContent = {
  title: "Planos de Sites",
  subtitle: "Escolha o plano ideal para o seu negócio. Todos incluem hospedagem e suporte técnico.",
  cta_button: "Começar Agora",
  compare_link: "Ver comparação completa e detalhes de cada plano",
};

const defaultDesignServicesContent = {
  title: "Design Digital Profissional",
  subtitle: "Não precisa de hospedagem? Compre apenas os serviços de design! Crie sua conta e peça seus criativos quando precisar.",
  cta_text: "Não tem conta ainda? Cadastre-se gratuitamente para comprar serviços de design.",
  catalog_button: "Ver Catálogo Completo",
};
