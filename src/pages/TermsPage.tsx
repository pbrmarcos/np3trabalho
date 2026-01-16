import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Scale, 
  Shield, 
  AlertTriangle, 
  Ban, 
  CreditCard, 
  XCircle, 
  RefreshCw,
  Gavel,
  Mail,
  Clock,
  CheckCircle
} from "lucide-react";

const TermsPage = () => {
  const lastUpdated = "19 de dezembro de 2024";

  return (
    <>
      <Helmet>
        <title>Termos de Uso | WebQ</title>
        <meta 
          name="description" 
          content="Termos de Uso da WebQ. Condições de uso dos serviços, responsabilidades, limitações e direitos dos usuários." 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Termos de Uso</h1>
              <p className="text-lg text-muted-foreground">
                Condições gerais para utilização dos serviços da WebQ
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Última atualização: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Introdução */}
            <section>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <p className="text-muted-foreground leading-relaxed">
                    Bem-vindo à WebQ! Estes Termos de Uso estabelecem as condições para a utilização 
                    dos nossos serviços de criação de sites, hospedagem e design. Ao utilizar nossos 
                    serviços, você concorda com estes termos. Por favor, leia-os atentamente.
                  </p>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* 1. Definições */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">1. Definições</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Para os fins destes Termos de Uso, consideram-se:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>"WebQ"</strong>: refere-se à empresa prestadora dos serviços, incluindo sua plataforma, site e sistemas.</li>
                  <li><strong>"Cliente" ou "Usuário"</strong>: pessoa física ou jurídica que contrata ou utiliza os serviços da WebQ.</li>
                  <li><strong>"Serviços"</strong>: incluem criação de sites, hospedagem, design gráfico, manutenção e suporte técnico.</li>
                  <li><strong>"Plataforma"</strong>: sistema online da WebQ onde o cliente pode gerenciar seus projetos e serviços.</li>
                  <li><strong>"Conteúdo"</strong>: textos, imagens, vídeos, arquivos e qualquer material fornecido pelo cliente ou criado pela WebQ.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 2. Aceitação dos Termos */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">2. Aceitação dos Termos</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Ao acessar ou utilizar os serviços da WebQ, você declara que:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Leu, compreendeu e concorda com estes Termos de Uso;</li>
                  <li>Tem capacidade legal para celebrar contratos vinculantes;</li>
                  <li>Tem pelo menos 18 anos de idade ou possui autorização de responsável legal;</li>
                  <li>Fornecerá informações verdadeiras, precisas e completas;</li>
                  <li>Concorda com nossa <a href="/politica-privacidade" className="text-primary hover:underline">Política de Privacidade</a>.</li>
                </ul>
                <Card className="bg-amber-500/10 border-amber-500/20 mt-4">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Importante:</strong> Se você não concordar com qualquer parte destes termos, 
                      não deverá utilizar nossos serviços.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            {/* 3. Serviços Oferecidos */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">3. Serviços Oferecidos</h2>
              </div>
              <div className="space-y-6 text-muted-foreground">
                <p className="leading-relaxed">
                  A WebQ oferece os seguintes serviços:
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Criação de Sites</h4>
                      <p className="text-sm">
                        Desenvolvimento de sites institucionais, landing pages e lojas virtuais 
                        com design personalizado e responsivo.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Hospedagem</h4>
                      <p className="text-sm">
                        Serviços de hospedagem com servidores de alta performance, 
                        certificado SSL e backup automático.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Design Gráfico</h4>
                      <p className="text-sm">
                        Criação de identidade visual, logotipos, materiais gráficos 
                        e elementos visuais para sua marca.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Suporte e Manutenção</h4>
                      <p className="text-sm">
                        Assistência técnica, atualizações de segurança e manutenção 
                        contínua dos serviços contratados.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <p className="leading-relaxed">
                  Os detalhes específicos de cada serviço, incluindo funcionalidades, prazos e valores, 
                  são definidos no momento da contratação e podem variar conforme o plano escolhido.
                </p>
              </div>
            </section>

            <Separator />

            {/* 4. Obrigações do Cliente */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">4. Obrigações do Cliente</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Ao utilizar nossos serviços, o cliente se compromete a:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Fornecer informações verdadeiras e atualizadas para cadastro e contato;</li>
                  <li>Manter a confidencialidade de suas credenciais de acesso;</li>
                  <li>Utilizar os serviços de acordo com a legislação brasileira vigente;</li>
                  <li>Não utilizar os serviços para fins ilegais, antiéticos ou que violem direitos de terceiros;</li>
                  <li>Fornecer todo o conteúdo necessário para o desenvolvimento do projeto dentro dos prazos acordados;</li>
                  <li>Garantir que possui os direitos sobre o conteúdo fornecido (textos, imagens, marcas, etc.);</li>
                  <li>Efetuar os pagamentos nos prazos estabelecidos;</li>
                  <li>Comunicar-se de forma respeitosa e profissional com a equipe da WebQ;</li>
                  <li>Realizar backups próprios de dados importantes, quando aplicável.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 5. Obrigações da WebQ */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">5. Obrigações da WebQ</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  A WebQ se compromete a:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Prestar os serviços contratados com qualidade e profissionalismo;</li>
                  <li>Cumprir os prazos acordados, salvo em casos de força maior ou atrasos causados pelo cliente;</li>
                  <li>Manter a infraestrutura de hospedagem funcionando adequadamente;</li>
                  <li>Oferecer suporte técnico conforme o plano contratado;</li>
                  <li>Proteger os dados do cliente de acordo com a LGPD;</li>
                  <li>Comunicar previamente sobre manutenções programadas que possam afetar os serviços;</li>
                  <li>Manter sigilo sobre informações confidenciais do cliente.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 6. Uso Proibido */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <h2 className="text-2xl font-semibold">6. Uso Proibido</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  É expressamente proibido utilizar os serviços da WebQ para:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-destructive/20">
                    <CardContent className="p-4">
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>Disseminar conteúdo ilegal, difamatório ou ofensivo</li>
                        <li>Práticas de spam ou envio de mensagens não solicitadas</li>
                        <li>Distribuição de malware, vírus ou códigos maliciosos</li>
                        <li>Violação de direitos autorais ou propriedade intelectual</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20">
                    <CardContent className="p-4">
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>Atividades de phishing ou fraude</li>
                        <li>Hospedagem de conteúdo pornográfico ou adulto</li>
                        <li>Práticas que sobrecarreguem a infraestrutura</li>
                        <li>Qualquer atividade que viole a legislação brasileira</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-destructive/5 border-destructive/20 mt-4">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Consequências:</strong> A violação destas regras pode resultar em suspensão 
                      imediata dos serviços, sem direito a reembolso, e possíveis medidas legais.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            {/* 7. Pagamentos e Faturamento */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">7. Pagamentos e Faturamento</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  As condições de pagamento são definidas no momento da contratação:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Os valores são expressos em Reais (BRL) e podem ser pagos via cartão de crédito, PIX ou boleto;</li>
                  <li>Serviços de assinatura (hospedagem) são cobrados de forma recorrente conforme o período contratado;</li>
                  <li>Serviços avulsos (design, criação de sites) são cobrados conforme acordo específico;</li>
                  <li>O atraso no pagamento pode resultar em suspensão dos serviços após notificação;</li>
                  <li>Reajustes anuais podem ser aplicados aos serviços de assinatura, com aviso prévio de 30 dias;</li>
                  <li>Cupons de desconto e promoções possuem regras específicas informadas no momento da aplicação.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 8. Cancelamento e Reembolso */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <XCircle className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">8. Cancelamento e Reembolso</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <h4 className="font-semibold text-foreground">8.1 Direito de Arrependimento</h4>
                <p className="leading-relaxed">
                  Conforme o Código de Defesa do Consumidor (Art. 49), o cliente pode desistir da 
                  contratação em até 7 (sete) dias corridos após a contratação, para serviços ainda 
                  não iniciados, com direito a reembolso integral.
                </p>

                <h4 className="font-semibold text-foreground">8.2 Cancelamento de Assinaturas</h4>
                <p className="leading-relaxed">
                  Assinaturas podem ser canceladas a qualquer momento. O serviço permanecerá ativo 
                  até o fim do período já pago, sem reembolso proporcional.
                </p>

                <h4 className="font-semibold text-foreground">8.3 Projetos em Andamento</h4>
                <p className="leading-relaxed">
                  Para projetos de criação de sites ou design em andamento, o valor proporcional 
                  ao trabalho já executado não será reembolsado.
                </p>

                <h4 className="font-semibold text-foreground">8.4 Cancelamento pela WebQ</h4>
                <p className="leading-relaxed">
                  A WebQ pode cancelar ou suspender serviços em caso de violação destes termos, 
                  inadimplência ou uso indevido, mediante notificação prévia quando possível. 
                  A WebQ também pode optar por não realizar um serviço contratado, caso em que 
                  o cliente receberá reembolso completo do valor pago.
                </p>
              </div>
            </section>

            <Separator />

            {/* 9. Propriedade Intelectual */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gavel className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">9. Propriedade Intelectual</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <h4 className="font-semibold text-foreground">9.1 Conteúdo do Cliente</h4>
                <p className="leading-relaxed">
                  O cliente mantém todos os direitos sobre o conteúdo que fornece (textos, imagens, 
                  logotipos, etc.). O cliente garante que possui os direitos necessários para 
                  utilização deste conteúdo.
                </p>

                <h4 className="font-semibold text-foreground">9.2 Trabalho Desenvolvido</h4>
                <p className="leading-relaxed">
                  Após a quitação integral do serviço, o cliente adquire os direitos sobre o 
                  trabalho desenvolvido especificamente para ele (layouts, designs exclusivos, etc.).
                </p>
                <Card className="bg-amber-500/10 border-amber-500/20 mt-2 mb-4">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Importante - Sites:</strong> Para serviços de criação de sites, o cliente 
                      adquire os direitos sobre o trabalho desenvolvido somente após 6 (seis) meses de 
                      permanência ativa no plano de hospedagem. Caso o cliente cancele o serviço antes 
                      deste período, será notificado para retirar o conteúdo, pois os direitos de criação 
                      permanecerão com a WebQ, podendo ser negociados separadamente.
                    </p>
                  </CardContent>
                </Card>

                <h4 className="font-semibold text-foreground">9.3 Propriedade da WebQ</h4>
                <p className="leading-relaxed">
                  A WebQ mantém a propriedade sobre sua plataforma, sistemas, metodologias, 
                  códigos-fonte genéricos e materiais não exclusivos utilizados nos projetos.
                </p>

                <h4 className="font-semibold text-foreground">9.4 Portfólio</h4>
                <p className="leading-relaxed">
                  Salvo acordo em contrário, a WebQ pode utilizar os trabalhos desenvolvidos 
                  em seu portfólio e materiais promocionais.
                </p>
              </div>
            </section>

            <Separator />

            {/* 10. Limitação de Responsabilidade */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h2 className="text-2xl font-semibold">10. Limitação de Responsabilidade</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Dentro dos limites permitidos pela legislação brasileira:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A WebQ não se responsabiliza por danos indiretos, lucros cessantes ou perda de dados;</li>
                  <li>A responsabilidade total da WebQ está limitada ao valor pago pelo cliente nos últimos 12 meses;</li>
                  <li>A WebQ não se responsabiliza por conteúdo inserido pelo cliente ou terceiros;</li>
                  <li>Não garantimos que os serviços serão ininterruptos ou livres de erros;</li>
                  <li>Eventos de força maior (desastres naturais, ataques cibernéticos em larga escala, etc.) isentam a WebQ de responsabilidade;</li>
                  <li>A WebQ não se responsabiliza por decisões de negócio baseadas no uso dos serviços.</li>
                </ul>
                <Card className="bg-amber-500/10 border-amber-500/20 mt-4">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong>Nota:</strong> Estas limitações não afetam direitos do consumidor 
                      garantidos por lei que não podem ser renunciados contratualmente.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            {/* 11. Disponibilidade dos Serviços */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">11. Disponibilidade dos Serviços</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  A WebQ se esforça para manter os serviços de hospedagem disponíveis 24 horas por dia, 
                  7 dias por semana. No entanto:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Manutenções programadas serão comunicadas com antecedência quando possível;</li>
                  <li>Interrupções emergenciais podem ocorrer para garantir segurança e estabilidade;</li>
                  <li>O SLA (Acordo de Nível de Serviço) específico pode variar conforme o plano contratado;</li>
                  <li>Problemas em infraestrutura de terceiros (provedores de internet, data centers) estão fora do nosso controle.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 12. Alterações nos Termos */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">12. Alterações nos Termos</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  A WebQ pode atualizar estes Termos de Uso periodicamente. Quando isso acontecer:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A data de "última atualização" no topo desta página será modificada;</li>
                  <li>Alterações significativas serão comunicadas por e-mail ou através da plataforma;</li>
                  <li>O uso continuado dos serviços após as alterações constitui aceitação dos novos termos;</li>
                  <li>Se você não concordar com as alterações, poderá cancelar os serviços conforme a seção 8.</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 13. Legislação e Foro */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gavel className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">13. Legislação e Foro</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Estes Termos de Uso são regidos pela legislação brasileira, incluindo:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Código Civil Brasileiro (Lei nº 10.406/2002)</li>
                  <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
                  <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
                  <li>Lei Geral de Proteção de Dados - LGPD (Lei nº 13.709/2018)</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  Para a resolução de qualquer controvérsia decorrente destes termos, fica eleito 
                  o foro da comarca de domicílio do consumidor, conforme previsto no Código de 
                  Defesa do Consumidor.
                </p>
              </div>
            </section>

            <Separator />

            {/* 14. Contato */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">14. Contato</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
                </p>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="space-y-2 text-sm">
                      <p><strong>E-mail:</strong> <a href="mailto:desenvolvedor@webq.com.br" className="text-primary hover:underline">desenvolvedor@webq.com.br</a></p>
                      <p><strong>Suporte Geral:</strong> <a href="mailto:suporte@webq.com.br" className="text-primary hover:underline">suporte@webq.com.br</a></p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Rodapé */}
            <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
              <p>
                © {new Date().getFullYear()} WebQ. Todos os direitos reservados.
              </p>
              <p className="mt-2">
                <a href="/politica-privacidade" className="text-primary hover:underline">Política de Privacidade</a>
                {" • "}
                <a href="/termos" className="text-primary hover:underline">Termos de Uso</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage;
