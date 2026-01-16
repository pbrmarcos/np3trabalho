import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Minus, Triangle, Zap, Shield, Mail, Server, Search, Settings, FileText, Layout, HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEOHead } from "@/components/SEOHead";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQCategory {
  name: string;
  questions: FAQQuestion[];
}

interface FAQContent {
  title: string;
  subtitle: string;
  categories: FAQCategory[];
}

const Plans = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const migrationId = searchParams.get('migration');

  // Handle navigation with migration parameter
  const handlePlanClick = (planId: string) => {
    if (migrationId) {
      navigate(`/planos/checkout?plan=${planId}&migration=${migrationId}`);
    } else {
      navigate(`/planos/checkout?plan=${planId}`);
    }
  };

  const { data: faqContent } = useQuery({
    queryKey: ['public-faq-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'faq_content')
        .maybeSingle();
      if (error) throw error;
      return data?.value as unknown as FAQContent;
    },
  });

  // Generate JSON-LD Schema for FAQ
  const generateFAQSchema = () => {
    if (!faqContent || !faqContent.categories || faqContent.categories.length === 0) {
      return null;
    }

    const allQuestions = faqContent.categories.flatMap(category => 
      category.questions.map(q => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.answer
        }
      }))
    );

    if (allQuestions.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allQuestions
    };
  };

  const faqSchema = generateFAQSchema();

  const plans = [
    {
      id: "essencial",
      name: "Essencial",
      price: "149",
      subtitle: "Para quem está começando",
      popular: false,
      features: [
        "Site One-Page Responsivo",
        "Hospedagem Inclusa",
        "3 Contas de E-mail Profissional",
        "10 GB de armazenamento NVMe",
        "Certificado SSL Gratuito",
        "Suporte por E-mail",
      ],
    },
    {
      id: "profissional",
      name: "Profissional",
      price: "299",
      subtitle: "Para empresas em crescimento",
      popular: true,
      features: [
        "Site Multi-páginas (até 5)",
        "Hospedagem Premium",
        "5 Contas de E-mail",
        "20 GB de armazenamento NVMe",
        "Blog/Notícias Integrado",
        "Otimização SEO Avançada",
        "Suporte Prioritário via WhatsApp",
      ],
    },
    {
      id: "performance",
      name: "Performance",
      price: "449",
      subtitle: "Para empresas que querem máxima velocidade e autoridade",
      popular: false,
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
    },
  ];

  const comparisonCategories = [
    {
      name: "Estrutura do Site",
      icon: Layout,
      features: [
        { name: "Tipo de Site", essencial: "One-Page", profissional: "Multi até 5", performance: "Multi até 10" },
        { name: "Layout Responsivo", essencial: true, profissional: true, performance: true },
        { name: "Design Exclusivo", essencial: true, profissional: true, performance: true },
        { name: "Páginas Otimizadas para Conversão", essencial: "partial", profissional: true, performance: true },
        { name: "Blog/Notícias Integrado", essencial: false, profissional: true, performance: true },
        { name: "Landing Pages Ilimitadas", essencial: false, profissional: false, performance: true },
        { name: "Navegação Otimizada (UX)", essencial: true, profissional: true, performance: true },
      ],
    },
    {
      name: "Hospedagem e Infraestrutura",
      icon: Server,
      features: [
        { name: "Hospedagem Inclusa", essencial: true, profissional: false, performance: false },
        { name: "Hospedagem Premium", essencial: false, profissional: true, performance: true },
        { name: "CDN Global", essencial: false, profissional: false, performance: true },
        { name: "Cache Avançado", essencial: false, profissional: false, performance: true },
        { name: "Armazenamento NVMe", essencial: "10 GB", profissional: "20 GB", performance: "50 GB" },
        { name: "PHP Atualizado + OPcache", essencial: true, profissional: true, performance: true },
        { name: "Servidor Otimizado (LiteSpeed/NGINX)", essencial: true, profissional: true, performance: true },
      ],
    },
    {
      name: "E-mails Profissionais",
      icon: Mail,
      features: [
        { name: "Contas de E-mail", essencial: "3", profissional: "5", performance: "Ilimitado" },
        { name: "Webmail + IMAP/SMTP", essencial: true, profissional: true, performance: true },
        { name: "Filtro Antispam Avançado", essencial: true, profissional: true, performance: true },
        { name: "DKIM, SPF e DMARC Configurados", essencial: true, profissional: true, performance: true },
        { name: "Painel de Gestão de E-mails", essencial: true, profissional: true, performance: true },
      ],
    },
    {
      name: "Segurança",
      icon: Shield,
      features: [
        { name: "Certificado SSL", essencial: true, profissional: true, performance: true },
        { name: "Firewall WAF", essencial: false, profissional: true, performance: true },
        { name: "Anti-DDoS", essencial: false, profissional: true, performance: true },
        { name: "Proteção de Login", essencial: true, profissional: true, performance: true },
        { name: "Monitoramento de Segurança 24/7", essencial: "partial", profissional: true, performance: true },
        { name: "reCAPTCHA Integrado", essencial: false, profissional: true, performance: true },
        { name: "Backups Automáticos", essencial: "Semanal", profissional: "Diário", performance: "Diário" },
        { name: "Restauração em 1 clique", essencial: false, profissional: true, performance: true },
      ],
    },
    {
      name: "SEO e Performance",
      icon: Search,
      features: [
        { name: "SEO Avançado", essencial: false, profissional: true, performance: true },
        { name: "SEO Técnico + Core Web Vitals", essencial: false, profissional: false, performance: true },
        { name: "Sitemap XML Automático", essencial: true, profissional: true, performance: true },
        { name: "Rich Snippets (Schema)", essencial: false, profissional: true, performance: true },
        { name: "URLs Amigáveis + 301", essencial: true, profissional: true, performance: true },
        { name: "Otimização de Imagens WebP", essencial: true, profissional: true, performance: true },
        { name: "Lazy Load + Pré-carregamento", essencial: true, profissional: true, performance: true },
      ],
    },
    {
      name: "Integrações e Marketing",
      icon: Zap,
      features: [
        { name: "Google Analytics", essencial: false, profissional: false, performance: true },
        { name: "Google Tag Manager", essencial: false, profissional: false, performance: true },
        { name: "Pixel Meta", essencial: false, profissional: "partial", performance: true },
        { name: "Botão WhatsApp", essencial: true, profissional: true, performance: true },
        { name: "Integração com E-mail Marketing", essencial: false, profissional: "partial", performance: true },
        { name: "Integração com CRM", essencial: false, profissional: false, performance: true },
      ],
    },
    {
      name: "Formulários e Automação",
      icon: FileText,
      features: [
        { name: "Formulários Personalizados", essencial: "partial", profissional: true, performance: true },
        { name: "Automação de Formulários", essencial: false, profissional: false, performance: true },
        { name: "Notificações por E-mail", essencial: true, profissional: true, performance: true },
        { name: "Anti-Spam Inteligente", essencial: "partial", profissional: true, performance: true },
        { name: "Upload de Arquivos no Form", essencial: false, profissional: true, performance: true },
      ],
    },
    {
      name: "Painel, Conteúdo e Gerenciamento",
      icon: Settings,
      features: [
        { name: "Painel WordPress Completo", essencial: true, profissional: true, performance: true },
        { name: "Editor Visual (Gutenberg/Elementor)", essencial: true, profissional: true, performance: true },
        { name: "Gestão de Mídias Ilimitada", essencial: true, profissional: true, performance: true },
        { name: "Criação e Edição de Conteúdo Básico", essencial: "partial", profissional: true, performance: true },
        { name: "Relatórios Mensais de Performance", essencial: false, profissional: false, performance: true },
      ],
    },
  ];

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <Check className="h-5 w-5 text-green-500 mx-auto" aria-label="Incluso" />;
    }
    if (value === false) {
      return <Minus className="h-5 w-5 text-muted-foreground mx-auto" aria-label="Não incluso" />;
    }
    if (value === "partial") {
      return <Triangle className="h-4 w-4 text-amber-500 mx-auto fill-amber-500" aria-label="Parcialmente incluso" />;
    }
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  };

  const scrollToPlans = () => {
    document.getElementById("plans-cards")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEOHead
        pageKey="plans"
        fallbackTitle="Planos e Preços | WebQ - Sites Profissionais"
        fallbackDescription="Escolha o plano ideal para seu negócio. Sites profissionais com hospedagem, suporte e manutenção inclusos. A partir de R$ 149/mês."
      />
      {faqSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        </Helmet>
      )}

      <main className="min-h-screen">
        {/* Hero Section */}
        <section 
          className="relative py-20 md:py-28 overflow-hidden"
          style={{
            backgroundImage: 'url(/images/hero-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-background/80" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-foreground">
                Seu site profissional, pronto para vender
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Criamos seu site do zero, com hospedagem premium, suporte contínuo e manutenção inclusa. 
                Você só se preocupa com seu negócio.
              </p>
              <Button 
                size="xl" 
                variant="hero" 
                onClick={scrollToPlans}
                aria-label="Escolher plano"
                className="mb-8"
              >
                Escolher meu Plano
              </Button>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Compre, receba seu site pronto e conte com a WebQ para suporte, hospedagem e manutenção. 
                Sem surpresas, sem custos ocultos.
              </p>
            </div>
          </div>
        </section>

        {/* Migration Banner */}
        {migrationId && (
          <div className="container mx-auto px-4 mb-8">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  Migração solicitada com sucesso!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Agora escolha o plano de hospedagem para seu site. A migração será incluída sem custo adicional.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans Cards Section */}
        <section id="plans-cards" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Escolha o plano ideal para você
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Todos os planos incluem criação do site, hospedagem e suporte. Sem taxa de setup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative flex flex-col transition-all duration-300 ${
                    plan.popular 
                      ? "border-primary shadow-lg scale-[1.02] md:scale-105" 
                      : "border-border hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Mais Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-display">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-foreground">R$ {plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "hero" : "outline"}
                      size="lg"
                      onClick={() => handlePlanClick(plan.id)}
                      aria-label={`Começar agora com plano ${plan.name}`}
                    >
                      Começar Agora
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Compare todos os recursos
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                Veja em detalhes o que cada plano oferece. São mais de 50 recursos para seu site.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Incluso</span>
                </div>
                <div className="flex items-center gap-2">
                  <Triangle className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-muted-foreground">Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Não incluso</span>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-8">
              {comparisonCategories.map((category) => (
                <Card key={category.name} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 py-4">
                    <div className="flex items-center gap-3">
                      <category.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[40%] font-semibold">Recurso</TableHead>
                            <TableHead className="text-center font-semibold">Essencial</TableHead>
                            <TableHead className="text-center font-semibold bg-primary/5">Profissional</TableHead>
                            <TableHead className="text-center font-semibold">Performance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.features.map((feature, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-foreground">{feature.name}</TableCell>
                              <TableCell className="text-center">{renderFeatureValue(feature.essencial)}</TableCell>
                              <TableCell className="text-center bg-primary/5">{renderFeatureValue(feature.profissional)}</TableCell>
                              <TableCell className="text-center">{renderFeatureValue(feature.performance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        {faqContent && faqContent.categories && faqContent.categories.length > 0 && (
          <section id="faq" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <HelpCircle className="h-8 w-8 text-primary" />
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    {faqContent.title}
                  </h2>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {faqContent.subtitle}
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-8">
                {faqContent.categories.map((category, catIndex) => (
                  <div key={catIndex} className="space-y-4">
                    <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                      {category.name}
                    </h3>
                    <Accordion type="single" collapsible className="space-y-2">
                      {category.questions.map((item, qIndex) => (
                        <AccordionItem 
                          key={qIndex} 
                          value={`cat-${catIndex}-q-${qIndex}`}
                          className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                        >
                          <AccordionTrigger className="text-left hover:no-underline py-4">
                            <span className="font-medium text-foreground pr-4">{item.question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4 whitespace-pre-line">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Design Services Section */}
        <section id="design" className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Design Digital
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Não precisa de hospedagem? Compre apenas os serviços de design! 
                Crie sua conta e peça seus criativos quando precisar.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 md:p-8 border border-primary/20 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
                  <Zap className="h-4 w-4" />
                  Sem mensalidade
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                  Criativos para Redes Sociais
                </h3>
                <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                  Artes profissionais para Instagram, Facebook, LinkedIn e mais. 
                  Pacotes a partir de 10 artes com entrega rápida.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="hero"
                    onClick={() => navigate('/design')}
                  >
                    Ver Catálogo de Design
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/cadastro')}
                  >
                    Criar Conta Grátis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Escolha seu plano e comece hoje
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Transforme sua presença online com um site profissional. 
                Hospedagem, suporte e manutenção inclusos em todos os planos.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                {plans.map((plan) => (
                  <Button
                    key={plan.id}
                    variant={plan.popular ? "hero" : "outline"}
                    size="lg"
                    onClick={() => navigate(`/planos/checkout?plan=${plan.id}`)}
                    aria-label={`Começar com ${plan.name}`}
                    className="min-w-[180px]"
                  >
                    {plan.name} - R$ {plan.price}/mês
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>SSL Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <span>Hospedagem Inclusa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Suporte Dedicado</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Plans;
