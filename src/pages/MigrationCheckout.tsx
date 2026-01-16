import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Eye, Sparkles, Gift, Loader2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BillingPeriodSelector, calculateBillingPeriods } from "@/components/BillingPeriodSelector";
import { PlanComparisonDialog } from "@/components/PlanComparisonDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { useDebounce } from "@/hooks/useDebounce";

const plans = [
  {
    id: "essencial",
    name: "Essencial",
    price: 149,
    subtitle: "Para quem está começando",
    popular: false,
    features: [
      "Site One-Page Responsivo",
      "3 Contas de E-mail",
      "10 GB de armazenamento NVMe",
      "Certificado SSL Gratuito",
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    price: 299,
    subtitle: "Para empresas em crescimento",
    popular: true,
    features: [
      "Site Multi-páginas (até 5)",
      "Blog/Notícias Integrado",
      "5 Contas de E-mail",
      "SEO Avançado",
    ],
  },
  {
    id: "performance",
    name: "Performance",
    price: 449,
    subtitle: "Máxima velocidade e autoridade",
    popular: false,
    features: [
      "Site Multi-páginas (até 10)",
      "CDN + Cache Avançado",
      "E-mails Ilimitados",
      "Analytics + Tag Manager",
    ],
  },
];

interface PromoCodeValidation {
  isValid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  message?: string;
}

export default function MigrationCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const migrationId = searchParams.get("id");
  const { user, isLoading: authLoading } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [migrationData, setMigrationData] = useState<{
    name: string;
    email: string;
    whatsapp: string;
    currentDomain: string;
  } | null>(null);

  // Promo code validation state
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const debouncedPromoCode = useDebounce(promoCode, 500);

  // Track animation states
  const [showPeriodSection, setShowPeriodSection] = useState(false);
  const [showSummarySection, setShowSummarySection] = useState(false);

  // Animate sections when plan/period changes
  useEffect(() => {
    if (selectedPlan) {
      setShowPeriodSection(false);
      const timer = setTimeout(() => setShowPeriodSection(true), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (selectedPlan && selectedPeriod) {
      setShowSummarySection(false);
      const timer = setTimeout(() => setShowSummarySection(true), 150);
      return () => clearTimeout(timer);
    }
  }, [selectedPlan, selectedPeriod]);

  // Validate promo code
  const validatePromoCode = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setPromoValidation(null);
      return;
    }

    setIsValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo-code", {
        body: { code },
      });

      if (error) {
        setPromoValidation({
          isValid: false,
          message: "Erro ao validar cupom",
        });
        return;
      }

      if (data?.valid) {
        setPromoValidation({
          isValid: true,
          discountPercent: data.percent_off,
          discountAmount: data.amount_off,
          message: data.percent_off 
            ? `${data.percent_off}% de desconto` 
            : data.amount_off 
            ? `R$ ${(data.amount_off / 100).toFixed(0)} de desconto`
            : "Cupom válido",
        });
      } else {
        setPromoValidation({
          isValid: false,
          message: data?.message || "Cupom inválido ou expirado",
        });
      }
    } catch {
      setPromoValidation({
        isValid: false,
        message: "Erro ao validar cupom",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  }, []);

  // Trigger validation when debounced code changes
  useEffect(() => {
    validatePromoCode(debouncedPromoCode);
  }, [debouncedPromoCode, validatePromoCode]);

  // Fetch migration data
  useEffect(() => {
    if (!migrationId) {
      navigate("/migracao");
      return;
    }

    const fetchMigration = async () => {
      const { data, error } = await supabase
        .from("migration_requests")
        .select("name, email, whatsapp, current_domain")
        .eq("id", migrationId)
        .single();

      if (error || !data) {
        toast.error("Migração não encontrada");
        navigate("/migracao");
        return;
      }

      setMigrationData({
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        currentDomain: data.current_domain,
      });
    };

    fetchMigration();
  }, [migrationId, navigate]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const billingPeriods = selectedPlanData 
    ? calculateBillingPeriods(selectedPlanData.price) 
    : [];
  const currentPeriod = billingPeriods.find(p => p.id === selectedPeriod);

  // Calculate final price with promo
  const calculateFinalPrice = () => {
    if (!currentPeriod) return 0;
    let total = currentPeriod.totalPrice;
    
    if (promoValidation?.isValid) {
      if (promoValidation.discountPercent) {
        total = total * (1 - promoValidation.discountPercent / 100);
      } else if (promoValidation.discountAmount) {
        total = Math.max(0, total - promoValidation.discountAmount / 100);
      }
    }
    
    return Math.round(total);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !selectedPeriod) {
      toast.error("Selecione um plano e período");
      return;
    }

    if (!user && !migrationData) {
      toast.error("Dados incompletos");
      return;
    }

    setIsSubmitting(true);

    try {
      // If not logged in, redirect to signup with migration context
      if (!user) {
        navigate(`/cadastro?plan=${selectedPlan}&period=${selectedPeriod}&migration=${migrationId}`);
        return;
      }

      // Create onboarding record if it doesn't exist
      const { data: existingOnboarding } = await supabase
        .from("client_onboarding")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingOnboarding) {
        await supabase.from("client_onboarding").insert({
          user_id: user.id,
          company_name: migrationData?.name || user.email?.split("@")[0] || "Empresa",
          whatsapp: migrationData?.whatsapp || "",
          business_type: "outro",
          selected_plan: selectedPlan,
          onboarding_status: "pending",
          needs_migration: true,
          migration_current_domain: migrationData?.currentDomain,
        });
      } else {
        await supabase
          .from("client_onboarding")
          .update({
            selected_plan: selectedPlan,
            needs_migration: true,
            migration_current_domain: migrationData?.currentDomain,
          })
          .eq("id", existingOnboarding.id);
      }

      // Create checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan_id: selectedPlan,
          billing_period: selectedPeriod,
          promo_code: promoValidation?.isValid ? promoCode : undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao processar checkout. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!migrationId || (!migrationData && !authLoading)) {
    return null;
  }

  const finalPrice = calculateFinalPrice();
  const hasPromoDiscount = promoValidation?.isValid && currentPeriod && finalPrice < currentPeriod.totalPrice;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        pageKey="migration-checkout"
        fallbackTitle="Escolha seu Plano | WebQ - Migração de Sites"
        fallbackDescription="Migração gratuita! Escolha o plano ideal e tenha seu site transferido para a WebQ sem custo adicional."
        canonicalUrl="https://webq.com.br/migracao/checkout"
      />

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/migracao")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <span className="font-display font-bold text-xl text-primary">WebQ</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="container py-8 md:py-12 max-w-5xl">
        {/* Success Banner */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3 mb-8 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">
              Migração solicitada com sucesso!
            </p>
            <p className="text-sm text-green-600 dark:text-green-500">
              Agora escolha o plano de hospedagem para {migrationData?.currentDomain}. 
              A migração será incluída sem custo adicional.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center gap-2 transition-all duration-300 ${selectedPlan ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              selectedPlan ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {selectedPlan ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Plano</span>
          </div>
          <div className={`w-8 h-0.5 transition-all duration-500 ${selectedPlan ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center gap-2 transition-all duration-300 ${selectedPlan && selectedPeriod ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              selectedPlan && selectedPeriod ? 'bg-primary text-primary-foreground' : selectedPlan ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {selectedPlan && selectedPeriod ? <Check className="h-4 w-4" /> : '2'}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Período</span>
          </div>
          <div className={`w-8 h-0.5 transition-all duration-500 ${selectedPlan && selectedPeriod ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center gap-2 transition-all duration-300 ${selectedPlan && selectedPeriod ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              selectedPlan && selectedPeriod ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              3
            </div>
            <span className="text-sm font-medium hidden sm:inline">Pagamento</span>
          </div>
        </div>

        {/* Plan Selection */}
        <section className="mb-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground mb-6">
            Todos os planos incluem migração gratuita, hospedagem e suporte.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, index) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-300 hover-scale ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]"
                      : plan.popular
                      ? "border-primary/50"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                      Mais Popular
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3 animate-scale-in">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="mb-4">
                      <span className="text-3xl font-bold">R$ {plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison Button */}
          <div className="text-center mt-6">
            <PlanComparisonDialog
              open={comparisonOpen}
              onOpenChange={setComparisonOpen}
              onSelectPlan={(planId) => {
                setSelectedPlan(planId);
                setComparisonOpen(false);
              }}
              trigger={
                <Button variant="ghost" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Ver diferença detalhada dos planos
                </Button>
              }
            />
          </div>
        </section>

        {/* Billing Period - Only show when plan selected */}
        {selectedPlan && selectedPlanData && showPeriodSection && (
          <section className="mb-10 animate-fade-in">
            <Separator className="mb-8" />
            <BillingPeriodSelector
              monthlyPrice={selectedPlanData.price}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </section>
        )}

        {/* Order Summary & Checkout */}
        {selectedPlan && currentPeriod && showSummarySection && (
          <section className="animate-fade-in">
            <Separator className="mb-8" />
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Summary */}
              <Card className="animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plano {selectedPlanData?.name}</span>
                    <span>{formatCurrency(selectedPlanData?.price || 0)}/mês</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Período</span>
                    <span>{currentPeriod.label}</span>
                  </div>
                  {currentPeriod.discountPercent > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Desconto período ({currentPeriod.discountPercent}%)
                      </span>
                      <span>
                        -{formatCurrency(
                          (selectedPlanData?.price || 0) * currentPeriod.months - currentPeriod.totalPrice
                        )}
                      </span>
                    </div>
                  )}
                  {hasPromoDiscount && (
                    <div className="flex justify-between text-sm text-green-600 animate-fade-in">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Cupom {promoCode}
                      </span>
                      <span>
                        -{formatCurrency(currentPeriod.totalPrice - finalPrice)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Migração do site
                    </span>
                    <span>Grátis</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <div className="text-right">
                      {hasPromoDiscount && (
                        <span className="text-sm text-muted-foreground line-through mr-2">
                          {formatCurrency(currentPeriod.totalPrice)}
                        </span>
                      )}
                      <span className="text-lg">{formatCurrency(finalPrice)}</span>
                    </div>
                  </div>
                  {currentPeriod.months > 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Equivale a {formatCurrency(finalPrice / currentPeriod.months)}/mês
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Checkout Form */}
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                {!user && (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Você será redirecionado para criar sua conta</p>
                    <p className="text-muted-foreground">
                      Usaremos o email: <strong>{migrationData?.email}</strong>
                    </p>
                  </div>
                )}

                {/* Promo Code with Real-time Validation */}
                <div className="space-y-2">
                  <Label htmlFor="promo-code">Cupom de desconto (opcional)</Label>
                  <div className="relative">
                    <Input
                      id="promo-code"
                      placeholder="Digite o código"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className={`pr-10 transition-all duration-200 ${
                        promoValidation?.isValid 
                          ? 'border-green-500 focus-visible:ring-green-500' 
                          : promoValidation && !promoValidation.isValid && promoCode.length >= 3
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidatingPromo && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {!isValidatingPromo && promoValidation?.isValid && (
                        <Check className="h-4 w-4 text-green-500 animate-scale-in" />
                      )}
                      {!isValidatingPromo && promoValidation && !promoValidation.isValid && promoCode.length >= 3 && (
                        <X className="h-4 w-4 text-red-500 animate-scale-in" />
                      )}
                    </div>
                  </div>
                  {promoValidation && promoCode.length >= 3 && (
                    <p className={`text-xs animate-fade-in ${
                      promoValidation.isValid ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {promoValidation.message}
                    </p>
                  )}
                </div>

                <Button
                  size="lg"
                  variant="hero"
                  className="w-full transition-all duration-300"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    "Ir para pagamento"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Pagamento seguro via Stripe. Você pode cancelar a qualquer momento.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
