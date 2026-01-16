import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CreditCard, MessageCircle, HelpCircle } from "lucide-react";
import { parseGradientText } from "@/lib/textUtils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
}

interface FAQContent {
  title: string;
  subtitle: string;
  questions: FAQQuestion[];
}

interface ContactConfig {
  whatsapp_number: string;
  whatsapp_message: string;
}

const defaultFAQContent: FAQContent = {
  title: "Por que escolher a WebQ?",
  subtitle: "Tudo o que você precisa em um só lugar",
  questions: [
    {
      id: "1",
      question: "Como acompanho o progresso do meu projeto?",
      answer:
        "Você tem acesso a um portal exclusivo onde acompanha cada etapa do seu projeto em tempo real. Receba notificações de atualizações, visualize o cronograma, faça upload de arquivos e comunique-se diretamente com nossa equipe através de tickets de suporte.",
    },
    {
      id: "2",
      question: "Quais serviços estão inclusos nos planos?",
      answer:
        "Todos os planos incluem: desenvolvimento do site, hospedagem premium com SSL, e-mails profissionais, backups automáticos, suporte técnico e manutenção contínua. Você não precisa contratar nada separadamente - cuidamos de tudo para você.",
    },
    {
      id: "3",
      question: "Vocês fazem migração de sites existentes?",
      answer:
        "Sim! Migramos seu site atual para nossa infraestrutura sem nenhum tempo de inatividade. Cuidamos de todo o processo técnico, incluindo transferência de domínio, e-mails e arquivos. Você continua operando normalmente enquanto fazemos a migração.",
    },
    {
      id: "4",
      question: "Posso contratar apenas serviços de design?",
      answer:
        "Com certeza! Oferecemos pacotes de design digital avulsos: artes para redes sociais, criação de marca/logo, papelaria digital, banners, apresentações e mais. Crie uma conta grátis e contrate apenas o que precisa, quando precisar.",
    },
    {
      id: "5",
      question: "Como funciona o suporte técnico?",
      answer:
        "Nosso suporte funciona através de tickets no seu portal do cliente, garantindo que cada solicitação seja registrada e resolvida. Planos superiores incluem atendimento prioritário via WhatsApp. Monitoramos seu site 24/7 e agimos proativamente em caso de problemas.",
    },
  ],
};

const defaultContactConfig: ContactConfig = {
  whatsapp_number: "5547988447665",
  whatsapp_message: "Olá! Gostaria de saber mais sobre os serviços da WebQ.",
};

export default function HomeFAQSection() {
  const { data: faqContent } = useQuery({
    queryKey: ["homepage-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "homepage_faq_content")
        .maybeSingle();

      if (error || !data) return defaultFAQContent;
      return data.value as unknown as FAQContent;
    },
  });

  const { data: contactConfig } = useQuery({
    queryKey: ["contact-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "contact_config")
        .maybeSingle();

      if (error || !data) return defaultContactConfig;
      return data.value as unknown as ContactConfig;
    },
  });

  const content = faqContent || defaultFAQContent;
  const contact = contactConfig || defaultContactConfig;

  const whatsappUrl = `https://wa.me/${contact.whatsapp_number}?text=${encodeURIComponent(contact.whatsapp_message)}`;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Tire suas dúvidas
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-display-md font-display text-foreground mb-3">
            {parseGradientText(content.title)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {parseGradientText(content.subtitle)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Left Column - FAQ Accordion (3/5) */}
          <div className="lg:col-span-3">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {content.questions.slice(0, 5).map((item, index) => (
                <AccordionItem
                  key={item.id || index}
                  value={`item-${index}`}
                  className="border border-border rounded-xl px-5 py-1 bg-card data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20 transition-all"
                >
                  <AccordionTrigger className="text-left text-sm md:text-base font-medium hover:no-underline py-4 text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* View all questions link */}
            <div className="mt-6 text-center lg:text-left">
              <Button
                variant="link"
                className="text-primary hover:text-primary/80 font-medium gap-2 p-0"
                asChild
              >
                <Link to="/planos#faq">
                  Ver todas as perguntas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column - CTA Card (2/5) */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 sticky top-24 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Ainda tem dúvidas?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Fale diretamente com um especialista da nossa equipe. Estamos prontos para ajudar!
                </p>
                <Button
                  size="lg"
                  className="w-full font-semibold gap-2"
                  onClick={() => window.open(whatsappUrl, '_blank')}
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com Especialista
                </Button>
                <p className="text-xs text-muted-foreground">
                  Atendimento via WhatsApp
                </p>
              </div>

              {/* Quick Links */}
              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  asChild
                >
                  <Link to="/ajuda">
                    <BookOpen className="h-4 w-4" />
                    Central de Ajuda
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() =>
                    document
                      .getElementById("planos")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <CreditCard className="h-4 w-4" />
                  Ver Planos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}