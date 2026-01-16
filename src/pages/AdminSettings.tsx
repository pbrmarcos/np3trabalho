import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Home, Mail, Link2, Settings, CreditCard, Palette, ImageIcon, HelpCircle, FileText, LayoutTemplate, CheckCircle2, AlertCircle, Clock, Share2, Ticket, Search, Chrome, Activity, Loader2, Shield, Cookie } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSettingsChange } from "@/services/auditService";
import PlansConfigForm from "@/components/admin/PlansConfigForm";
import StripeConfigForm from "@/components/admin/StripeConfigForm";
import HomeContentForm from "@/components/admin/HomeContentForm";
import OnboardingConfigForm from "@/components/admin/OnboardingConfigForm";
import FAQConfigForm from "@/components/admin/FAQConfigForm";
import PortfolioConfigForm from "@/components/admin/PortfolioConfigForm";
import HomeFAQConfigForm from "@/components/admin/HomeFAQConfigForm";
import EmailConfigSection from "@/components/admin/EmailConfigSection";
import BrandLogosConfigForm from "@/components/admin/BrandLogosConfigForm";
import DesignPackagesConfigForm from "@/components/admin/DesignPackagesConfigForm";
import ResendConfigForm from "@/components/admin/ResendConfigForm";
import SLAConfigForm from "@/components/admin/SLAConfigForm";
import DesignBackgroundConfigForm from "@/components/admin/DesignBackgroundConfigForm";
import SocialMediaConfigForm from "@/components/admin/SocialMediaConfigForm";
import CouponsConfigForm from "@/components/admin/CouponsConfigForm";
import HostingPriceIdsForm from "@/components/admin/HostingPriceIdsForm";
import GoogleSearchConsoleConfigForm from "@/components/admin/GoogleSearchConsoleConfigForm";
import GoogleOAuthConfigForm from "@/components/admin/GoogleOAuthConfigForm";
import UptimeRobotConfigForm from "@/components/admin/UptimeRobotConfigForm";
import LGPDConfigForm from "@/components/admin/LGPDConfigForm";
import CookieConsentAudit from "@/components/admin/CookieConsentAudit";

type SectionStatus = 'configured' | 'pending' | 'none';

// Section Header Component with status badge
function SectionHeader({ 
  icon: Icon, 
  title, 
  description, 
  status = 'none',
  id 
}: { 
  icon: any; 
  title: string; 
  description: string;
  status?: SectionStatus;
  id?: string;
}) {
  return (
    <Card className="border-dashed mb-6" id={id}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          {status === 'configured' && (
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configurado
            </Badge>
          )}
          {status === 'pending' && (
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 gap-1">
              <AlertCircle className="h-3 w-3" />
              Pendente
            </Badge>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

// Quick Navigation Component
function QuickNav({ items }: { items: { id: string; label: string; status?: SectionStatus }[] }) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-lg bg-muted/50 border border-dashed">
      <span className="text-sm text-muted-foreground mr-2 self-center">Ir para:</span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-background border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {item.label}
          {item.status === 'configured' && (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          )}
          {item.status === 'pending' && (
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      const settingsMap: Record<string, any> = {};
      data?.forEach(item => { settingsMap[item.key] = { id: item.id, value: item.value, description: item.description }; });
      return settingsMap;
    },
  });

  // Helper to check if a setting is configured
  const isConfigured = (key: string): SectionStatus => {
    if (!settings) return 'pending';
    
    // Verificação especial para planos (salvos individualmente)
    if (key === 'plans_config') {
      const basic = settings?.plan_basic?.value;
      const professional = settings?.plan_professional?.value;
      const performance = settings?.plan_performance?.value;
      const hasStripeIds = basic?.price_id || professional?.price_id || performance?.price_id;
      return hasStripeIds ? 'configured' : 'pending';
    }
    
    const setting = settings[key];
    if (!setting?.value) return 'pending';
    // Check if the value has actual content
    if (typeof setting.value === 'object') {
      return Object.keys(setting.value).length > 0 ? 'configured' : 'pending';
    }
    return 'configured';
  };

  // Check specific integrations
  const getStripeStatus = (): SectionStatus => {
    const hostingPriceIds = settings?.hosting_price_ids?.value;
    if (!hostingPriceIds) return 'pending';
    // Check if at least monthly prices are configured
    const hasMonthlyIds = hostingPriceIds.basic?.monthly || 
                          hostingPriceIds.professional?.monthly || 
                          hostingPriceIds.performance?.monthly;
    return hasMonthlyIds ? 'configured' : 'pending';
  };
  
  const getPriceIdsStatus = (): SectionStatus => {
    const hostingPriceIds = settings?.hosting_price_ids?.value;
    if (!hostingPriceIds) return 'pending';
    let count = 0;
    Object.values(hostingPriceIds).forEach((plan: any) => {
      Object.values(plan || {}).forEach((id: any) => {
        if (id && typeof id === 'string' && id.startsWith('price_')) count++;
      });
    });
    return count >= 3 ? 'configured' : 'pending'; // At least 3 configured (monthly for each plan)
  };

  const getLogosStatus = (): SectionStatus => {
    const logos = settings?.brand_logos_config?.value;
    if (!logos) return 'pending';
    return (logos.fullLogoLight || logos.fullLogoDark) ? 'configured' : 'pending';
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const existing = settings?.[key];
      const oldValue = existing?.value;
      
      if (existing) {
        const { error } = await supabase.from('system_settings').update({ value, updated_by: user?.id }).eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('system_settings').insert({ key, value, updated_by: user?.id });
        if (error) throw error;
      }
      
      return { key, oldValue, newValue: value };
    },
    onSuccess: async ({ key, oldValue, newValue }) => { 
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); 
      queryClient.invalidateQueries({ queryKey: ['public-settings'] }); 
      queryClient.invalidateQueries({ queryKey: ['brand-logos-config'] }); 
      toast.success('Configurações salvas!'); 
      
      // Audit log
      await logSettingsChange(key, `Configuração "${key}" atualizada`, oldValue, newValue);
    },
    onError: (error) => { toast.error('Erro ao salvar: ' + error.message); },
  });

  const handleSave = (key: string, value: any) => { updateSettingMutation.mutate({ key, value }); };

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Configurações" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1 md:mb-2">Configurações do Sistema</h1>
        <p className="text-sm md:text-base text-muted-foreground">Gerencie produtos, conteúdo e integrações da plataforma.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="!grid w-full grid-cols-8 max-w-6xl">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Homepage</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">E-mails</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger value="google-oauth" className="flex items-center gap-2">
              <Chrome className="h-4 w-4" />
              <span className="hidden sm:inline">Google OAuth</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="cookies" className="flex items-center gap-2">
              <Cookie className="h-4 w-4" />
              <span className="hidden sm:inline">Cookies</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>

          {/* Produtos: Planos + Pacotes de Design */}
          <TabsContent value="products">
            <QuickNav items={[
              { id: 'section-plans', label: 'Planos', status: isConfigured('plans_config') },
              { id: 'section-design', label: 'Pacotes de Design' },
              { id: 'section-brand', label: 'Criação de Marca', status: isConfigured('brand_creation_config') }
            ]} />
            <div className="space-y-8">
              <div>
                <SectionHeader 
                  id="section-plans"
                  icon={CreditCard} 
                  title="Planos de Assinatura" 
                  description="Configure os planos mensais oferecidos aos clientes com preços, recursos e integração Stripe."
                  status={isConfigured('plans_config')}
                />
                <PlansConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-design"
                  icon={Palette} 
                  title="Pacotes de Design" 
                  description="Gerencie serviços de design avulsos como posts para redes sociais, papelaria e materiais digitais."
                />
                <DesignPackagesConfigForm />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-brand"
                  icon={Palette} 
                  title="Criação de Marca (Onboarding)" 
                  description="Configure preço e detalhes do serviço de criação de identidade visual oferecido no onboarding."
                  status={isConfigured('brand_creation_config')}
                />
                <OnboardingConfigForm settings={settings} />
              </div>
            </div>
          </TabsContent>

          {/* Homepage: Conteúdo + Portfólio + FAQ da Home */}
          <TabsContent value="homepage">
            <QuickNav items={[
              { id: 'section-hero', label: 'Hero & CTA', status: isConfigured('hero_content') },
              { id: 'section-design-bg', label: 'Design Background', status: isConfigured('design_services_config') },
              { id: 'section-portfolio', label: 'Portfólio' },
              { id: 'section-home-faq', label: 'FAQ da Home', status: isConfigured('homepage_faq_content') }
            ]} />
            <div className="space-y-8">
              <div>
                <SectionHeader 
                  id="section-hero"
                  icon={LayoutTemplate} 
                  title="Hero & CTA" 
                  description="Edite os textos principais da página inicial: título hero, subtítulo e chamadas para ação."
                  status={isConfigured('hero_content')}
                />
                <HomeContentForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-design-bg"
                  icon={ImageIcon} 
                  title="Background - Design Services" 
                  description="Configure a imagem de fundo da seção de serviços de design na homepage."
                  status={isConfigured('design_services_config')}
                />
                <DesignBackgroundConfigForm settings={settings ? Object.fromEntries(Object.entries(settings).map(([k, v]: [string, any]) => [k, v.value])) : undefined} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-portfolio"
                  icon={ImageIcon} 
                  title="Portfólio" 
                  description="Galeria de trabalhos exibida na homepage. Adicione screenshots, configure animações e ordem de exibição."
                />
                <PortfolioConfigForm />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-home-faq"
                  icon={HelpCircle} 
                  title="FAQ da Homepage" 
                  description="Perguntas frequentes exibidas na seção FAQ da página inicial."
                  status={isConfigured('homepage_faq_content')}
                />
                <HomeFAQConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
            </div>
          </TabsContent>

          {/* E-mails: Templates + Logs + Rodapé */}
          <TabsContent value="emails">
            <SectionHeader 
              icon={Mail} 
              title="E-mails Automáticos" 
              description="Gerencie templates de email, visualize logs de envio e configure o rodapé padrão."
              status={isConfigured('email_config')}
            />
            <EmailConfigSection settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
          </TabsContent>

          {/* Integrações: Stripe + Cupons + Resend */}
          <TabsContent value="integrations">
            <QuickNav items={[
              { id: 'section-stripe', label: 'Stripe', status: getStripeStatus() },
              { id: 'section-price-ids', label: 'Price IDs', status: getPriceIdsStatus() },
              { id: 'section-coupons', label: 'Cupons' },
              { id: 'section-resend', label: 'Resend', status: isConfigured('email_config') },
              { id: 'section-gsc', label: 'Google Search Console', status: isConfigured('google_search_console_config') }
            ]} />
            <div className="space-y-8">
              <div>
                <SectionHeader 
                  id="section-stripe"
                  icon={CreditCard} 
                  title="Stripe (Pagamentos)" 
                  description="Configurações de integração com Stripe para processamento de pagamentos e assinaturas."
                  status={getStripeStatus()}
                />
                <StripeConfigForm settings={settings} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-price-ids"
                  icon={CreditCard} 
                  title="Price IDs por Período" 
                  description="Configure os Price IDs do Stripe para cada plano e período de cobrança (mensal, semestral, anual, bienal)."
                  status={getPriceIdsStatus()}
                />
                <HostingPriceIdsForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-coupons"
                  icon={Ticket} 
                  title="Cupons e Códigos Promocionais" 
                  description="Crie cupons de desconto e códigos promocionais para usar no checkout."
                />
                <CouponsConfigForm />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-resend"
                  icon={Mail} 
                  title="Resend (E-mails)" 
                  description="Conexão com o serviço Resend para envio de emails transacionais e marketing."
                  status={isConfigured('email_config')}
                />
                <ResendConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-gsc"
                  icon={Search} 
                  title="Google Search Console" 
                  description="Configure a verificação do site para monitorar a presença nos resultados de busca do Google."
                  status={isConfigured('google_search_console_config')}
                />
                <GoogleSearchConsoleConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
            </div>
          </TabsContent>

          {/* Google OAuth */}
          <TabsContent value="google-oauth">
            <GoogleOAuthConfigForm />
          </TabsContent>

          {/* Performance - UptimeRobot */}
          <TabsContent value="performance">
            <SectionHeader 
              icon={Activity} 
              title="Monitoramento de Performance" 
              description="Configure o UptimeRobot para monitorar a disponibilidade e performance dos seus sites."
              status={isConfigured('uptimerobot_config')}
            />
            <UptimeRobotConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
          </TabsContent>

          {/* Cookies & LGPD: Sub-tabs for better organization */}
          <TabsContent value="cookies">
            <Tabs defaultValue="audit" className="w-full">
              <TabsList className="mb-6 w-full justify-start">
                <TabsTrigger value="audit" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Auditoria
                </TabsTrigger>
                <TabsTrigger value="config" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Configurações LGPD
                </TabsTrigger>
              </TabsList>

              <TabsContent value="audit">
                <CookieConsentAudit />
              </TabsContent>

              <TabsContent value="config">
                <SectionHeader 
                  id="section-lgpd"
                  icon={Shield} 
                  title="LGPD & Privacidade" 
                  description="Configure o banner de consentimento de cookies e conformidade com a Lei Geral de Proteção de Dados."
                  status={isConfigured('lgpd_config')}
                />
                <LGPDConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Sistema: SLA + Logos + Redes Sociais + FAQ de Planos */}
          <TabsContent value="system">
            <QuickNav items={[
              { id: 'section-sla', label: 'SLA & Prazos', status: isConfigured('sla_config') },
              { id: 'section-logos', label: 'Logos', status: getLogosStatus() },
              { id: 'section-social', label: 'Redes Sociais', status: isConfigured('contact_config') },
              { id: 'section-faq-plans', label: 'FAQ de Planos', status: isConfigured('faq_content') }
            ]} />
            <div className="space-y-8">
              <div>
                <SectionHeader 
                  id="section-sla"
                  icon={Clock} 
                  title="SLA & Prazos" 
                  description="Configure os prazos e alertas para demandas de design e tickets de suporte."
                  status={isConfigured('sla_config')}
                />
                <SLAConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-logos"
                  icon={Palette} 
                  title="Logos da Marca" 
                  description="Configure as versões de logo para temas claro e escuro usadas em todo o sistema."
                  status={getLogosStatus()}
                />
                <BrandLogosConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>

              <div>
                <SectionHeader 
                  id="section-social"
                  icon={Share2} 
                  title="Redes Sociais e Contato" 
                  description="Configure as redes sociais e informações de contato exibidas no rodapé do site."
                  status={isConfigured('contact_config')}
                />
                <SocialMediaConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
              
              <div>
                <SectionHeader 
                  id="section-faq-plans"
                  icon={FileText} 
                  title="FAQ da Página de Planos" 
                  description="Perguntas frequentes exibidas na página /planos com informações sobre serviços e pagamentos."
                  status={isConfigured('faq_content')}
                />
                <FAQConfigForm settings={settings} onSave={handleSave} isSaving={updateSettingMutation.isPending} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AdminLayoutWithSidebar>
  );
}
