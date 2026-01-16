import { CheckCircle2, ArrowRight, LayoutDashboard, Phone, Clock, Sparkles, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type PurchaseType = "plan" | "design" | "design_briefing" | "brand" | "unknown";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isAnimating, setIsAnimating] = useState(false);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("unknown");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [designOrderId, setDesignOrderId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsAnimating(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Detect purchase type and onboarding status
  useEffect(() => {
    const checkPurchaseType = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check onboarding status
        const { data: onboarding, error: onboardingError } = await supabase
          .from("client_onboarding")
          .select("id, onboarding_status, needs_brand_creation, selected_plan")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (onboardingError) {
          console.error("Error fetching onboarding:", onboardingError);
        }

        if (onboarding) {
          // Check if this is a plan purchase with pending onboarding
          if (onboarding.selected_plan && onboarding.onboarding_status === "pending") {
            setPurchaseType("plan");
            setHasCompletedOnboarding(false);
          } else if (onboarding.selected_plan && onboarding.onboarding_status === "complete") {
            setPurchaseType("plan");
            setHasCompletedOnboarding(true);
          } else if (onboarding.needs_brand_creation) {
            setPurchaseType("brand");
            setHasCompletedOnboarding(onboarding.onboarding_status === "complete");
          }
        }

        // Check for recent design orders V2 with pending briefing (priority)
        if (purchaseType === "unknown") {
          const { data: designOrderPendingBriefing } = await supabase
            .from("design_orders")
            .select("id, status")
            .eq("client_id", user.id)
            .eq("status", "pending_briefing")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (designOrderPendingBriefing) {
            setPurchaseType("design_briefing");
            setDesignOrderId(designOrderPendingBriefing.id);
          } else {
            // Check for any recent design order
            const { data: designOrder } = await supabase
              .from("design_orders")
              .select("id")
              .eq("client_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (designOrder) {
              setPurchaseType("design");
            }
          }
        }
      } catch (error) {
        console.error("Error detecting purchase type:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPurchaseType();
  }, [user?.id, purchaseType]);

  const getNextSteps = () => {
    // If plan purchase with pending onboarding
    if (purchaseType === "plan" && hasCompletedOnboarding === false) {
      return [
        {
          icon: FileEdit,
          title: "Complete seu cadastro",
          description: "Preencha as informações do seu projeto para começarmos",
          highlight: true,
        },
        {
          icon: Phone,
          title: "Contato via WhatsApp",
          description: "Nossa equipe entrará em contato após você completar o cadastro",
        },
        {
          icon: Sparkles,
          title: "Início do Desenvolvimento",
          description: "Começaremos a criar seu site com base nas informações fornecidas",
        },
      ];
    }

    // Design order V2 with pending briefing
    if (purchaseType === "design_briefing") {
      return [
        {
          icon: FileEdit,
          title: "Preencha o Briefing",
          description: "Envie as informações e referências para iniciarmos o design",
          highlight: true,
        },
        {
          icon: Clock,
          title: "Produção do Design",
          description: "Nossa equipe iniciará a criação após receber o briefing",
        },
        {
          icon: Sparkles,
          title: "Entregas e Revisões",
          description: "Você receberá as versões para aprovação e ajustes",
        },
      ];
    }

    // Default steps
    return [
      {
        icon: Phone,
        title: "Contato via WhatsApp",
        description: "Nossa equipe entrará em contato em até 24 horas úteis",
        highlight: true,
      },
      {
        icon: Sparkles,
        title: "Início do Desenvolvimento",
        description: "Começaremos a criar seu site com base nas informações fornecidas",
      },
      {
        icon: LayoutDashboard,
        title: "Acompanhe seu Projeto",
        description: "Use o painel para ver o progresso e compartilhar arquivos",
      },
    ];
  };

  const nextSteps = getNextSteps();

  const handleCTA = () => {
    if (purchaseType === "plan" && hasCompletedOnboarding === false) {
      navigate("/cliente/onboarding");
    } else if (purchaseType === "design_briefing" && designOrderId) {
      navigate(`/cliente/design/briefing?order=${designOrderId}`);
    } else if (purchaseType === "design") {
      navigate("/cliente/design");
    } else {
      navigate("/cliente/dashboard");
    }
  };

  const getButtonText = () => {
    if (purchaseType === "plan" && hasCompletedOnboarding === false) {
      return "Completar Cadastro";
    }
    if (purchaseType === "design_briefing") {
      return "Preencher Briefing";
    }
    if (purchaseType === "design") {
      return "Ver Meus Pedidos de Design";
    }
    return "Ir para Meus Projetos";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Processando seu pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="border-border/50 shadow-xl overflow-hidden">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center justify-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Pagamento Confirmado</span>
            </div>
          </div>
          
          <CardContent className="pt-8 pb-8 px-6 md:px-8 text-center">
            {/* Animated Check Icon */}
            <div
              className={`mx-auto mb-6 w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center transition-all duration-700 ease-out ${
                isAnimating ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            >
              <CheckCircle2
                className={`w-12 h-12 text-green-500 transition-all duration-500 delay-300 ${
                  isAnimating ? "scale-100" : "scale-0"
                }`}
              />
            </div>

            {/* Title */}
            <h1
              className={`text-2xl font-bold text-foreground mb-2 transition-all duration-500 delay-200 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Bem-vindo à WebQ!
            </h1>

            {/* Description */}
            <p
              className={`text-muted-foreground mb-6 transition-all duration-500 delay-300 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
            {purchaseType === "plan" && hasCompletedOnboarding === false
              ? "Sua assinatura foi ativada! Agora complete seu cadastro para começarmos seu projeto."
              : purchaseType === "design_briefing"
              ? "Pagamento confirmado! Preencha o briefing para iniciarmos a produção do seu design."
              : "Sua assinatura foi ativada com sucesso. Estamos muito felizes em tê-lo conosco!"}
            </p>

            {/* Next Steps */}
            <div
              className={`space-y-4 mb-8 transition-all duration-500 delay-400 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                Próximos Passos
              </h2>
              <div className="space-y-3">
                {nextSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 text-left p-3 rounded-lg ${
                      step.highlight 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.highlight ? "bg-primary/20" : "bg-primary/10"
                    }`}>
                      <step.icon className={`w-4 h-4 ${step.highlight ? "text-primary" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {step.highlight && (
                      <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Importante
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleCTA}
              size="lg"
              className={`w-full transition-all duration-500 delay-500 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              {getButtonText()}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Session ID (for debugging/reference) */}
            {sessionId && (
              <p className="mt-4 text-xs text-muted-foreground/60">
                Referência: {sessionId.slice(0, 20)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}