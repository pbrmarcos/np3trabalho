import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Home, MessageSquare, Briefcase, CreditCard, Palette, HelpCircle } from "lucide-react";

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

interface FAQSectionContent {
  title: string;
  subtitle: string;
}

interface HomeContentFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function HomeContentForm({ settings, onSave, isSaving }: HomeContentFormProps) {
  const [heroContent, setHeroContent] = useState<HeroContent>({
    title: '',
    subtitle: '',
    cta_primary: '',
    cta_secondary: '',
  });

  const [ctaContent, setCtaContent] = useState<CtaContent>({
    title: '',
    subtitle: '',
    button_text: '',
  });

  const [servicesContent, setServicesContent] = useState<ServicesContent>({
    title: '',
    subtitle: '',
  });

  const [plansContent, setPlansContent] = useState<PlansContent>({
    title: '',
    subtitle: '',
    cta_button: '',
    compare_link: '',
  });

  const [designServicesContent, setDesignServicesContent] = useState<DesignServicesContent>({
    title: '',
    subtitle: '',
    cta_text: '',
    catalog_button: '',
  });

  const [faqContent, setFaqContent] = useState<FAQSectionContent>({
    title: '',
    subtitle: '',
  });

  useEffect(() => {
    if (settings) {
      if (settings.hero_content?.value) {
        setHeroContent(settings.hero_content.value);
      }
      if (settings.cta_content?.value) {
        setCtaContent(settings.cta_content.value);
      }
      if (settings.services_content?.value) {
        setServicesContent(settings.services_content.value);
      } else {
        setServicesContent({
          title: 'Nossos Serviços',
          subtitle: 'Soluções completas para sua presença digital, do desenvolvimento à manutenção contínua.',
        });
      }
      if (settings.plans_content?.value) {
        setPlansContent(settings.plans_content.value);
      } else {
        setPlansContent({
          title: 'Planos de Sites',
          subtitle: 'Escolha o plano ideal para o seu negócio. Todos incluem hospedagem e suporte técnico.',
          cta_button: 'Começar Agora',
          compare_link: 'Ver comparação completa e detalhes de cada plano',
        });
      }
      if (settings.design_services_content?.value) {
        setDesignServicesContent(settings.design_services_content.value);
      } else {
        setDesignServicesContent({
          title: 'Design Digital Profissional',
          subtitle: 'Não precisa de hospedagem? Compre apenas os serviços de design! Crie sua conta e peça seus criativos quando precisar.',
          cta_text: 'Não tem conta ainda? Cadastre-se gratuitamente para comprar serviços de design.',
          catalog_button: 'Ver Catálogo Completo',
        });
      }
      if (settings.homepage_faq_content?.value) {
        const faqData = settings.homepage_faq_content.value;
        setFaqContent({
          title: faqData.title || 'Por que escolher a WebQ?',
          subtitle: faqData.subtitle || 'Tudo o que você precisa em um só lugar',
        });
      } else {
        setFaqContent({
          title: 'Por que escolher a WebQ?',
          subtitle: 'Tudo o que você precisa em um só lugar',
        });
      }
    }
  }, [settings]);

  const handleSaveHero = () => {
    onSave('hero_content', heroContent);
  };

  const handleSaveCta = () => {
    onSave('cta_content', ctaContent);
  };

  const handleSaveServices = () => {
    onSave('services_content', servicesContent);
  };

  const handleSavePlans = () => {
    onSave('plans_content', plansContent);
  };

  const handleSaveDesignServices = () => {
    onSave('design_services_content', designServicesContent);
  };

  const handleSaveFaq = () => {
    // We need to preserve the existing questions while updating title/subtitle
    const existingFaq = settings?.homepage_faq_content?.value;
    onSave('homepage_faq_content', {
      ...existingFaq,
      title: faqContent.title,
      subtitle: faqContent.subtitle,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Seção Hero (Principal)
          </CardTitle>
          <CardDescription>
            Edite o título, subtítulo e botões da seção principal da página inicial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Título Principal</Label>
            <Textarea
              id="hero-title"
              value={heroContent.title}
              onChange={(e) => setHeroContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Sua empresa\n*precisa ser vista.*"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">*texto*</code> para destacar com gradiente. 
              Use <code className="bg-muted px-1 rounded">\n</code> para quebra de linha.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtítulo</Label>
            <Textarea
              id="hero-subtitle"
              value={heroContent.subtitle}
              onChange={(e) => setHeroContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Desenvolvemos sites profissionais..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hero-cta-primary">Botão Principal</Label>
              <Input
                id="hero-cta-primary"
                value={heroContent.cta_primary}
                onChange={(e) => setHeroContent(prev => ({ ...prev, cta_primary: e.target.value }))}
                placeholder="Falar com Especialista"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-cta-secondary">Botão Secundário</Label>
              <Input
                id="hero-cta-secondary"
                value={heroContent.cta_secondary}
                onChange={(e) => setHeroContent(prev => ({ ...prev, cta_secondary: e.target.value }))}
                placeholder="Ver Portfólio"
              />
            </div>
          </div>

          <Button onClick={handleSaveHero} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção Hero
          </Button>
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Seção de Serviços
          </CardTitle>
          <CardDescription>
            Edite o título e subtítulo da seção de serviços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="services-title">Título</Label>
            <Input
              id="services-title"
              value={servicesContent.title}
              onChange={(e) => setServicesContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nossos Serviços"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">*texto*</code> para destacar com gradiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="services-subtitle">Subtítulo</Label>
            <Textarea
              id="services-subtitle"
              value={servicesContent.subtitle}
              onChange={(e) => setServicesContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Soluções completas para sua presença digital..."
              rows={2}
              className="resize-none"
            />
          </div>

          <Button onClick={handleSaveServices} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção Serviços
          </Button>
        </CardContent>
      </Card>

      {/* Plans Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Seção de Planos
          </CardTitle>
          <CardDescription>
            Edite o título, subtítulo e textos dos botões da seção de planos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plans-title">Título</Label>
            <Input
              id="plans-title"
              value={plansContent.title}
              onChange={(e) => setPlansContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Planos de Sites"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plans-subtitle">Subtítulo</Label>
            <Textarea
              id="plans-subtitle"
              value={plansContent.subtitle}
              onChange={(e) => setPlansContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Escolha o plano ideal para o seu negócio..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plans-cta-button">Texto do Botão</Label>
              <Input
                id="plans-cta-button"
                value={plansContent.cta_button}
                onChange={(e) => setPlansContent(prev => ({ ...prev, cta_button: e.target.value }))}
                placeholder="Começar Agora"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plans-compare-link">Texto do Link de Comparação</Label>
              <Input
                id="plans-compare-link"
                value={plansContent.compare_link}
                onChange={(e) => setPlansContent(prev => ({ ...prev, compare_link: e.target.value }))}
                placeholder="Ver comparação completa..."
              />
            </div>
          </div>

          <Button onClick={handleSavePlans} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção Planos
          </Button>
        </CardContent>
      </Card>

      {/* Design Services Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Seção de Design Digital
          </CardTitle>
          <CardDescription>
            Edite o título, subtítulo e textos da seção de serviços de design
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="design-title">Título</Label>
            <Input
              id="design-title"
              value={designServicesContent.title}
              onChange={(e) => setDesignServicesContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Design Digital Profissional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="design-subtitle">Subtítulo</Label>
            <Textarea
              id="design-subtitle"
              value={designServicesContent.subtitle}
              onChange={(e) => setDesignServicesContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Não precisa de hospedagem? Compre apenas os serviços de design!..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="design-cta-text">Texto CTA (chamada para ação)</Label>
              <Textarea
                id="design-cta-text"
                value={designServicesContent.cta_text}
                onChange={(e) => setDesignServicesContent(prev => ({ ...prev, cta_text: e.target.value }))}
                placeholder="Não tem conta ainda? Cadastre-se..."
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-catalog-button">Texto do Botão Catálogo</Label>
              <Input
                id="design-catalog-button"
                value={designServicesContent.catalog_button}
                onChange={(e) => setDesignServicesContent(prev => ({ ...prev, catalog_button: e.target.value }))}
                placeholder="Ver Catálogo Completo"
              />
            </div>
          </div>

          <Button onClick={handleSaveDesignServices} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção Design
          </Button>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Seção FAQ
          </CardTitle>
          <CardDescription>
            Edite o título e subtítulo da seção de perguntas frequentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faq-title">Título</Label>
            <Input
              id="faq-title"
              value={faqContent.title}
              onChange={(e) => setFaqContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Por que escolher a WebQ?"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">*texto*</code> para destacar com gradiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="faq-subtitle">Subtítulo</Label>
            <Textarea
              id="faq-subtitle"
              value={faqContent.subtitle}
              onChange={(e) => setFaqContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Tudo o que você precisa em um só lugar"
              rows={2}
              className="resize-none"
            />
          </div>

          <Button onClick={handleSaveFaq} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção FAQ
          </Button>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Seção CTA (Call to Action)
          </CardTitle>
          <CardDescription>
            Edite o conteúdo da seção de chamada para ação no final da página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-title">Título</Label>
            <Input
              id="cta-title"
              value={ctaContent.title}
              onChange={(e) => setCtaContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Pronto para começar?"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">*texto*</code> para destacar com gradiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta-subtitle">Subtítulo</Label>
            <Textarea
              id="cta-subtitle"
              value={ctaContent.subtitle}
              onChange={(e) => setCtaContent(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Entre em contato conosco..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta-button">Texto do Botão</Label>
            <Input
              id="cta-button"
              value={ctaContent.button_text}
              onChange={(e) => setCtaContent(prev => ({ ...prev, button_text: e.target.value }))}
              placeholder="Falar com Especialista"
            />
          </div>

          <Button onClick={handleSaveCta} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Seção CTA
          </Button>
        </CardContent>
      </Card>

      {/* Preview hint */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Após salvar as alterações, abra a página inicial em uma nova aba 
            para visualizar as mudanças. As alterações são aplicadas instantaneamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
