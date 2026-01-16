import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Server, Shield, Zap, HeadphonesIcon, Globe, RefreshCw, HelpCircle, FileText, Search, FileCheck, Rocket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { SEOHead } from "@/components/SEOHead";
const migrationFaqs = [
  {
    question: "Quanto tempo leva a migração do meu site?",
    answer: "O tempo de migração varia de acordo com a complexidade do site. Sites simples podem ser migrados em 24-48 horas, enquanto sites maiores ou com funcionalidades complexas podem levar de 3 a 7 dias úteis. Nossa equipe avaliará seu caso e informará o prazo específico."
  },
  {
    question: "Meu site ficará fora do ar durante a migração?",
    answer: "Não! Realizamos a migração sem downtime. Seu site continua funcionando normalmente na hospedagem atual enquanto configuramos tudo em nossa infraestrutura. A troca é feita de forma rápida através do apontamento DNS, minimizando qualquer impacto."
  },
  {
    question: "Vocês migram qualquer tipo de site?",
    answer: "Sim! Migramos sites WordPress, HTML/CSS, lojas virtuais (WooCommerce, Magento, PrestaShop), aplicações customizadas e muito mais. Nossa equipe técnica está preparada para lidar com diferentes tecnologias e plataformas."
  },
  {
    question: "Preciso fornecer acesso ao meu painel de hospedagem atual?",
    answer: "Sim, para realizar a migração precisaremos de acesso ao painel de controle da sua hospedagem atual (cPanel, Plesk ou similar) e/ou acesso FTP. Também precisaremos de acesso ao banco de dados, se houver. Todas as credenciais são tratadas com sigilo total."
  },
  {
    question: "Meus emails serão migrados também?",
    answer: "Sim! Se você utiliza emails profissionais (@seudominio.com.br), eles também serão migrados. Você não perderá nenhum email e as contas continuarão funcionando normalmente após a migração."
  },
  {
    question: "Quanto custa a migração?",
    answer: "A migração em si é gratuita! Você paga apenas o plano de hospedagem escolhido (Essencial, Profissional ou Performance). Nossa equipe faz todo o trabalho técnico sem custo adicional."
  },
  {
    question: "E se algo der errado durante a migração?",
    answer: "Mantemos backup completo do seu site durante todo o processo. Se qualquer problema ocorrer, podemos restaurar tudo instantaneamente. Além disso, seu site original permanece intacto na hospedagem atual até confirmarmos que tudo está funcionando perfeitamente."
  },
  {
    question: "Preciso cancelar minha hospedagem atual?",
    answer: "Só recomendamos cancelar após confirmarmos que a migração foi concluída com sucesso e o DNS já propagou (geralmente 24-48h após a finalização). Nossa equipe orientará sobre o momento ideal para fazer o cancelamento."
  }
];

const benefits = [
  {
    icon: Server,
    title: "Infraestrutura Premium",
    description: "Servidores NVMe de alta performance com 99.9% de uptime garantido"
  },
  {
    icon: Shield,
    title: "SSL Grátis Incluso",
    description: "Certificado SSL/TLS automático para segurança do seu site"
  },
  {
    icon: Zap,
    title: "Velocidade Otimizada",
    description: "CDN global e cache avançado para carregamento ultrarrápido"
  },
  {
    icon: RefreshCw,
    title: "Backups Automáticos",
    description: "Backups diários automáticos para proteção dos seus dados"
  },
  {
    icon: HeadphonesIcon,
    title: "Suporte Especializado",
    description: "Equipe técnica disponível para auxiliar em qualquer necessidade"
  },
  {
    icon: Globe,
    title: "Migração Sem Downtime",
    description: "Transferimos seu site sem interrupção no serviço"
  }
];

const steps = [
  { 
    icon: FileText, 
    title: "Formulário", 
    description: "Informe os dados do seu site atual",
    tooltip: "Preencha o formulário com as informações do seu site atual, hospedagem e tipo de plataforma."
  },
  { 
    icon: Search, 
    title: "Análise", 
    description: "Avaliamos a complexidade",
    tooltip: "Nossa equipe técnica analisa seu site para garantir uma migração perfeita e sem surpresas."
  },
  { 
    icon: FileCheck, 
    title: "Proposta", 
    description: "Orçamento personalizado",
    tooltip: "Receba uma proposta adequada ao seu projeto com o plano ideal para suas necessidades."
  },
  { 
    icon: Rocket, 
    title: "Migração", 
    description: "Transferência segura",
    tooltip: "Transferimos todos os arquivos, banco de dados e emails sem perda de dados e sem downtime."
  },
  { 
    icon: PartyPopper, 
    title: "Pronto!", 
    description: "Site funcionando",
    tooltip: "Seu site está no ar em nossa infraestrutura premium com suporte especializado incluso!"
  }
];

export default function MigrationPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    currentDomain: "",
    currentHost: "",
    siteType: "wordpress",
    additionalInfo: ""
  });

  useEffect(() => {
    const handleScroll = () => {
      if (!stepsRef.current) return;
      
      const rect = stepsRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionHeight = rect.height;
      const sectionCenter = rect.top + sectionHeight / 2;
      const viewportCenter = windowHeight / 2;
      const distanceFromCenter = viewportCenter - sectionCenter;
      const maxDistance = windowHeight / 2 + sectionHeight / 2;
      const progress = Math.max(0, Math.min(1, (distanceFromCenter + maxDistance / 2) / maxDistance));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // SEOHead is rendered inside the component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.whatsapp || !formData.currentDomain) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save request to database
      const { data: migrationData, error: dbError } = await supabase
        .from("migration_requests")
        .insert({
          name: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          current_domain: formData.currentDomain,
          current_host: formData.currentHost || null,
          site_type: formData.siteType,
          additional_info: formData.additionalInfo || null
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("Error saving migration request:", dbError);
        throw dbError;
      }

      // Send email to admin with migration request
      const { error: adminError } = await supabase.functions.invoke("send-email", {
        body: {
          to: "suporte@webq.com.br",
          subject: `Nova solicitação de migração: ${formData.currentDomain}`,
          html: `
            <h2>Nova Solicitação de Migração de Site</h2>
            <p><strong>Nome:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>WhatsApp:</strong> ${formData.whatsapp}</p>
            <p><strong>Domínio atual:</strong> ${formData.currentDomain}</p>
            <p><strong>Hospedagem atual:</strong> ${formData.currentHost || "Não informado"}</p>
            <p><strong>Tipo de site:</strong> ${formData.siteType}</p>
            <p><strong>Informações adicionais:</strong> ${formData.additionalInfo || "Nenhuma"}</p>
          `
        }
      });

      if (adminError) {
        console.error("Error sending admin notification:", adminError);
      }

      // Send confirmation email to client using template
      const { error: clientError } = await supabase.functions.invoke("send-email", {
        body: {
          template_slug: "migration_request_received",
          recipients: [formData.email],
          variables: {
            client_name: formData.name,
            current_domain: formData.currentDomain,
            current_hosting: formData.currentHost || "Não informado",
            whatsapp: formData.whatsapp
          }
        }
      });

      if (clientError) {
        console.error("Error sending client confirmation:", clientError);
      }

      toast.success("Migração solicitada! Agora escolha seu plano de hospedagem.");
      
      // Redirect to checkout page with migration ID
      navigate(`/migracao/checkout?id=${migrationData.id}`);
    } catch (error) {
      console.error("Error sending migration request:", error);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <SEOHead
        pageKey="migration"
        fallbackTitle="Migração de Sites | WebQ - Transfira seu Site Gratuitamente"
        fallbackDescription="Migre seu site para a WebQ sem custo adicional. Suporte completo para WordPress, Wix, HTML e e-commerce. Sem downtime."
      />
      {/* Hero Section */}
      <section className="pt-32 pb-8 md:pt-40 md:pb-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <RefreshCw className="h-4 w-4" />
              Migração de Sites
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Traga seu site para a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                WebQ
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Migramos seu site existente para nossa infraestrutura premium sem downtime. 
              Aproveite hospedagem de alta performance, suporte especializado e muito mais.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section - Now at the top */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <Card className="border-border/50">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl md:text-3xl font-display">
                  Solicite sua migração
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Preencha o formulário abaixo e escolha seu plano de hospedagem
                </p>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp *</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentDomain">Domínio atual *</Label>
                      <Input
                        id="currentDomain"
                        value={formData.currentDomain}
                        onChange={(e) => setFormData({ ...formData, currentDomain: e.target.value })}
                        placeholder="www.seusite.com.br"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentHost">Hospedagem atual (opcional)</Label>
                    <Input
                      id="currentHost"
                      value={formData.currentHost}
                      onChange={(e) => setFormData({ ...formData, currentHost: e.target.value })}
                      placeholder="Ex: Locaweb, Hostinger, GoDaddy..."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Tipo de site *</Label>
                    <RadioGroup
                      value={formData.siteType}
                      onValueChange={(value) => setFormData({ ...formData, siteType: value })}
                      className="grid grid-cols-2 md:grid-cols-4 gap-3"
                    >
                      {[
                        { value: "wordpress", label: "WordPress" },
                        { value: "html", label: "HTML/CSS" },
                        { value: "ecommerce", label: "E-commerce" },
                        { value: "outro", label: "Outro" }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Informações adicionais (opcional)</Label>
                    <Textarea
                      id="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      placeholder="Descreva qualquer informação relevante sobre seu site (funcionalidades, plugins, integrações...)"
                      rows={4}
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Continuar para Escolher Plano"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Após preencher, você escolherá seu plano de hospedagem e finalizará o pagamento.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Grid - Por que migrar */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Por que migrar para a WebQ?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Oferecemos uma infraestrutura completa para seu site funcionar com máxima performance
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors bg-background">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Steps - Como funciona */}
      <section className="py-16 md:py-24" ref={stepsRef}>
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
            Como funciona a <span className="text-gradient">migração</span>?
          </h2>
          
          <TooltipProvider delayDuration={100}>
            <div className="relative">
              {/* Connection line - horizontal for desktop */}
              <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out bg-primary dark:bg-gradient-to-r dark:from-primary dark:via-emerald-500 dark:to-emerald-400"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>

              {/* Connection line - vertical for mobile */}
              <div className="md:hidden absolute left-6 top-12 bottom-12 w-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="w-full rounded-full transition-all duration-500 ease-out bg-primary dark:bg-gradient-to-b dark:from-primary dark:via-emerald-500 dark:to-emerald-400"
                  style={{ height: `${scrollProgress * 100}%` }}
                />
              </div>

              <div className="grid md:grid-cols-5 gap-8 md:gap-4">
                {steps.map((step, index) => {
                  const activeStep = Math.floor(scrollProgress * steps.length);
                  const isActive = index <= activeStep;
                  const StepIcon = step.icon;
                  const isFinalStep = index === steps.length - 1;

                  return (
                    <div key={index} className="flex md:flex-col items-center md:text-center relative z-10">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative cursor-pointer">
                            <div 
                              className={`
                                h-14 w-14 md:h-20 md:w-20 rounded-full flex items-center justify-center
                                transition-all duration-500 ease-out
                                ${isActive 
                                  ? isFinalStep 
                                    ? 'bg-primary dark:bg-emerald-500 shadow-lg shadow-primary/30 dark:shadow-emerald-500/40' 
                                    : 'bg-primary shadow-lg shadow-primary/30' 
                                  : 'bg-muted/30 border-2 border-muted'
                                }
                              `}
                            >
                              {isActive && (
                                <div 
                                  className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isFinalStep ? 'bg-primary dark:bg-emerald-500' : 'bg-primary'}`}
                                  style={{ animationDuration: '2s' }}
                                />
                              )}
                              <StepIcon 
                                className={`h-6 w-6 md:h-8 md:w-8 transition-colors duration-300 ${
                                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                                }`}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="max-w-[250px] text-center bg-popover border-border"
                        >
                          <p className="text-sm">{step.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>

                      <div className="ml-4 md:ml-0 md:mt-4">
                        <span 
                          className={`
                            inline-block px-3 py-1 rounded-full text-xs font-medium mb-2
                            transition-all duration-300
                            ${isActive 
                              ? isFinalStep
                                ? 'bg-background text-primary dark:text-emerald-500 border-2 border-primary dark:border-emerald-500' 
                                : 'bg-background text-primary border-2 border-primary'
                              : 'bg-muted text-muted-foreground'
                            }
                          `}
                        >
                          {step.title}
                        </span>
                        <p className={`text-sm transition-colors duration-300 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <HelpCircle className="h-4 w-4" />
                Dúvidas Frequentes
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Perguntas sobre Migração
              </h2>
              <p className="text-muted-foreground">
                Tire suas dúvidas sobre o processo de migração do seu site
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {migrationFaqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-background border border-border/50 rounded-lg px-6 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-10 text-center">
              <p className="text-muted-foreground mb-4">
                Ainda tem dúvidas? Entre em contato conosco
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:suporte@webq.com.br">
                  Falar com suporte
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
