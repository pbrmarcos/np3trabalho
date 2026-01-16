import { useState } from "react";
import { Shield, Cookie, Lock, Eye, FileText, Mail, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  useCookieConsent, 
  predefinedCookies, 
  categoryConfig,
  CookieCategory 
} from "@/hooks/useCookieConsent";
import { Helmet } from "react-helmet";
import { CookieDataDeletionDialog } from "@/components/CookieDataDeletionDialog";

export default function PrivacyPolicyPage() {
  const { consent, saveCustomConsent } = useCookieConsent();
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [customPreferences, setCustomPreferences] = useState({
    preferences: consent.preferences,
    analytics: consent.analytics,
    marketing: consent.marketing,
  });

  const handleOpenCookieSettings = () => {
    setCustomPreferences({
      preferences: consent.preferences,
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
    setShowCookieSettings(true);
  };

  const handleSaveCookies = () => {
    saveCustomConsent(
      customPreferences.preferences,
      customPreferences.analytics,
      customPreferences.marketing
    );
    setShowCookieSettings(false);
  };

  const getCookiesByCategory = (category: CookieCategory) => {
    return predefinedCookies.filter((c) => c.category === category);
  };

  const categories: CookieCategory[] = ["essential", "analytics", "preferences", "marketing"];

  return (
    <>
      <Helmet>
        <title>Política de Privacidade | WebQ</title>
        <meta name="description" content="Conheça nossa política de privacidade e saiba como tratamos seus dados pessoais de acordo com a LGPD." />
        <meta name="keywords" content="política de privacidade, LGPD, proteção de dados, cookies, privacidade" />
        <link rel="canonical" href="/politica-privacidade" />
        <meta property="og:title" content="Política de Privacidade | WebQ" />
        <meta property="og:description" content="Conheça nossa política de privacidade e saiba como tratamos seus dados pessoais de acordo com a LGPD." />
      </Helmet>

      <div className="container max-w-4xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Cookie className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Preferências de Cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Gerencie quais cookies você permite
                  </p>
                </div>
              </div>
              <Button onClick={handleOpenCookieSettings} variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Gerenciar Cookies
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              1. Introdução
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A WebQ ("nós", "nosso" ou "empresa") está comprometida em proteger sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos 
              suas informações pessoais quando você utiliza nosso site e serviços, em conformidade 
              com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ao utilizar nossos serviços, você concorda com os termos desta política. 
              Recomendamos a leitura atenta de todo o documento.
            </p>
          </section>

          <Separator />

          {/* Data Controller */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              2. Controlador de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A WebQ é a controladora dos dados pessoais coletados através de nosso site e serviços. 
              Isso significa que somos responsáveis por decidir como e por que seus dados pessoais 
              são tratados.
            </p>
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Contato do Encarregado de Dados (DPO):</strong><br />
                  E-mail: <a href="mailto:desenvolvedor@webq.com.br" className="text-primary hover:underline">desenvolvedor@webq.com.br</a>
                </p>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              3. Dados que Coletamos
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Coletamos diferentes tipos de informações para fornecer e melhorar nossos serviços:
            </p>
            
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Dados de Identificação</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Nome completo</li>
                    <li>Endereço de e-mail</li>
                    <li>Número de telefone/WhatsApp</li>
                    <li>Nome da empresa (quando aplicável)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Dados de Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Páginas visitadas e tempo de permanência</li>
                    <li>Interações com funcionalidades do site</li>
                    <li>Preferências de interface (tema, configurações)</li>
                    <li>Feedback enviado em artigos de ajuda</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Dados Técnicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Endereço IP</li>
                    <li>Tipo de navegador e dispositivo</li>
                    <li>Sistema operacional</li>
                    <li>Dados de cookies e tecnologias similares</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Cookies Section */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Cookie className="h-6 w-6 text-primary" />
              4. Cookies e Tecnologias Similares
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência. 
              Você pode gerenciar suas preferências a qualquer momento.
            </p>

            <div className="space-y-4">
              {categories.map((category) => {
                const config = categoryConfig[category];
                const cookies = getCookiesByCategory(category);
                
                return (
                  <Card key={category} className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {config.label}
                        {config.locked && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Sempre ativo
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
                      {cookies.length > 0 && (
                        <div className="space-y-2">
                          {cookies.map((cookie, idx) => (
                            <div key={idx} className="text-xs bg-muted/50 rounded p-2 flex justify-between">
                              <code className="font-mono text-primary">{cookie.name}</code>
                              <span className="text-muted-foreground">{cookie.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4">
              <Button onClick={handleOpenCookieSettings} variant="outline" className="w-full sm:w-auto">
                <Settings2 className="h-4 w-4 mr-2" />
                Gerenciar Preferências de Cookies
              </Button>
            </div>
          </section>

          <Separator />

          {/* Data Usage */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              5. Como Usamos Seus Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Utilizamos seus dados pessoais para as seguintes finalidades:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Prestação de serviços:</strong> criar e gerenciar sua conta, processar pedidos e fornecer suporte.</li>
              <li><strong>Comunicação:</strong> enviar notificações sobre seu projeto, atualizações de serviço e responder suas solicitações.</li>
              <li><strong>Melhoria dos serviços:</strong> analisar o uso do site para melhorar funcionalidades e experiência do usuário.</li>
              <li><strong>Segurança:</strong> proteger contra fraudes, ataques e uso não autorizado.</li>
              <li><strong>Obrigações legais:</strong> cumprir exigências legais e regulatórias.</li>
            </ul>
          </section>

          <Separator />

          {/* Legal Basis */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              6. Base Legal para o Tratamento
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Tratamos seus dados pessoais com base nas seguintes fundamentações legais previstas na LGPD:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Consentimento (Art. 7º, I):</strong> para cookies não essenciais e comunicações de marketing.</li>
              <li><strong>Execução de contrato (Art. 7º, V):</strong> para fornecer os serviços contratados.</li>
              <li><strong>Interesse legítimo (Art. 7º, IX):</strong> para segurança, prevenção de fraudes e melhoria dos serviços.</li>
              <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> para atender exigências legais e regulatórias.</li>
            </ul>
          </section>

          <Separator />

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              7. Compartilhamento de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Podemos compartilhar seus dados pessoais com:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Prestadores de serviço:</strong> empresas que nos auxiliam na operação (hospedagem, processamento de pagamentos, envio de e-mails).</li>
              <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial.</li>
              <li><strong>Parceiros de negócio:</strong> apenas com seu consentimento explícito.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Não vendemos, alugamos ou comercializamos seus dados pessoais para terceiros.
            </p>
          </section>

          <Separator />

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              8. Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              De acordo com a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Confirmação", desc: "Confirmar a existência de tratamento de dados" },
                { title: "Acesso", desc: "Acessar seus dados pessoais" },
                { title: "Correção", desc: "Corrigir dados incompletos ou desatualizados" },
                { title: "Anonimização", desc: "Anonimizar, bloquear ou eliminar dados desnecessários" },
                { title: "Portabilidade", desc: "Receber seus dados em formato estruturado" },
                { title: "Eliminação", desc: "Solicitar a exclusão de dados tratados com consentimento" },
                { title: "Informação", desc: "Saber com quem seus dados são compartilhados" },
                { title: "Revogação", desc: "Revogar consentimento a qualquer momento" },
              ].map((right) => (
                <Card key={right.title} className="border-border">
                  <CardContent className="p-4">
                    <p className="font-medium text-foreground">{right.title}</p>
                    <p className="text-sm text-muted-foreground">{right.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail{" "}
              <a href="mailto:desenvolvedor@webq.com.br" className="text-primary hover:underline">
                desenvolvedor@webq.com.br
              </a>.
            </p>

            {/* Right to be Forgotten - Cookie Data Deletion */}
            <Card className="mt-6 border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Direito ao Esquecimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Você pode solicitar a exclusão dos dados de navegação e cookies associados à sua sessão. 
                  Esta ação é irreversível e remove permanentemente seus dados de rastreamento.
                </p>
                <CookieDataDeletionDialog />
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              9. Retenção de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades 
              para as quais foram coletados, incluindo obrigações legais, contratuais e regulatórias. 
              Após esse período, os dados são eliminados ou anonimizados de forma segura.
            </p>
          </section>

          <Separator />

          {/* Security */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              10. Segurança dos Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados 
              pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares e seguros</li>
              <li>Treinamento de equipe em proteção de dados</li>
            </ul>
          </section>

          <Separator />

          {/* Policy Updates */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground">
              11. Alterações nesta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos alterações 
              significativas, notificaremos você através do e-mail cadastrado ou de um aviso em nosso site. 
              Recomendamos revisar esta página regularmente para se manter informado.
            </p>
          </section>

          <Separator />

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              12. Contato
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, 
              entre em contato conosco:
            </p>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="space-y-2 text-sm">
                  <p><strong>E-mail:</strong> <a href="mailto:desenvolvedor@webq.com.br" className="text-primary hover:underline">desenvolvedor@webq.com.br</a></p>
                  <p><strong>Suporte Geral:</strong> <a href="mailto:suporte@webq.com.br" className="text-primary hover:underline">suporte@webq.com.br</a></p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      <Dialog open={showCookieSettings} onOpenChange={setShowCookieSettings}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais cookies você permite. Cookies essenciais são sempre ativos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {categories.map((category) => {
              const config = categoryConfig[category];
              const cookies = getCookiesByCategory(category);
              const isEnabled = category === "essential" ? true : customPreferences[category as keyof typeof customPreferences];

              return (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{config.label}</span>
                        {config.locked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Sempre ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={config.locked}
                      onCheckedChange={(checked) => {
                        if (!config.locked) {
                          setCustomPreferences((prev) => ({
                            ...prev,
                            [category]: checked,
                          }));
                        }
                      }}
                    />
                  </div>

                  {cookies.length > 0 && (
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="cookies" className="border-0">
                        <AccordionTrigger className="text-xs py-2 hover:no-underline text-muted-foreground">
                          Ver {cookies.length} cookie{cookies.length > 1 ? "s" : ""}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {cookies.map((cookie, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-muted/50 rounded p-2"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <code className="font-mono text-[10px] text-primary">
                                    {cookie.name}
                                  </code>
                                  <span className="text-muted-foreground shrink-0">
                                    {cookie.duration}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-1">
                                  {cookie.purpose}
                                </p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCookieSettings(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCookies} className="flex-1">
              Salvar preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
