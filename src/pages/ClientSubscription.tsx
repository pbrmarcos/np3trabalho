import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, AlertTriangle, Calendar, ExternalLink, Check, Palette, History } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { usePlans } from "@/hooks/usePlans";
import { useAuth } from "@/hooks/useAuth";
import ErrorState from "@/components/ErrorState";

export default function ClientSubscription() {
  const { user } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [addBrandCreation, setAddBrandCreation] = useState(false);
  const { data: plans } = usePlans();

  const { data: subscription, isLoading, error: subscriptionError, refetch } = useQuery({
    queryKey: ["subscription-details"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  // Fetch pending onboarding (if any) to get context
  const { data: onboarding } = useQuery({
    queryKey: ["pending-onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Erro ao abrir portal de gerenciamento. Entre em contato com o suporte.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleSubscribe = async (planId: string, priceId: string) => {
    if (!priceId) {
      toast.error("Plano não configurado. Entre em contato com o suporte.");
      return;
    }
    
    setIsLoadingCheckout(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado.");
        return;
      }

      // Build checkout body with plan_id and onboarding_id for proper tracking
      const checkoutBody: Record<string, any> = { 
        price_id: priceId,
        plan_id: planId, // Send plan identifier for updating onboarding after payment
      };
      
      // If there's a pending onboarding, include its ID
      if (onboarding?.id) {
        checkoutBody.onboarding_id = onboarding.id;
        
        // If user wants brand creation and it wasn't paid yet
        if (addBrandCreation && onboarding.needs_brand_creation && !onboarding.brand_creation_paid) {
          checkoutBody.add_brand_creation = true;
        }
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: checkoutBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setIsLoadingCheckout(null);
    }
  };

  const generateNextPayments = (startDate: string) => {
    const payments = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 12; i++) {
      payments.push(addMonths(start, i));
    }
    
    return payments;
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Assinatura" }
  ];

  if (isLoading) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </ClientLayout>
    );
  }

  if (subscriptionError) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs} title="Minha Assinatura">
        <div className="max-w-2xl mx-auto">
          <ErrorState
            title="Erro ao carregar assinatura"
            message="Não foi possível carregar os dados da sua assinatura. Por favor, tente novamente."
            onRetry={() => refetch()}
            showHomeButton
          />
        </div>
      </ClientLayout>
    );
  }

  const isSubscribed = subscription?.subscribed;
  const planName = subscription?.plan_name || "Plano";
  const subscriptionEnd = subscription?.subscription_end;
  const subscriptionStart = subscription?.subscription_start;
  const paymentType = subscription?.payment_type;
  const daysUntilExpiration = subscription?.days_until_expiration;

  return (
    <ClientLayout breadcrumbs={breadcrumbs} title="Minha Assinatura">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Subscription Status */}
        <Card className={`border-2 ${isSubscribed ? "border-green-500/50" : "border-yellow-500/50"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSubscribed ? "bg-green-500/10" : "bg-yellow-500/10"
                }`}>
                  {isSubscribed ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {isSubscribed ? "Assinatura Ativa" : "Sem Assinatura Ativa"}
                  </CardTitle>
                  <CardDescription>
                    {isSubscribed ? `Plano ${planName}` : "Você não possui uma assinatura ativa"}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isSubscribed ? "default" : "secondary"} className={
                isSubscribed 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-yellow-500 hover:bg-yellow-600 text-white"
              }>
                {isSubscribed ? "ATIVO" : "PENDENTE"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {isSubscribed && (
          <>
            {/* Payment Details */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Detalhes do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subscriptionStart && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Início da Assinatura</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(subscriptionStart), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {subscriptionEnd && (
                    <div className={`p-4 rounded-lg ${
                      paymentType === 'one-time' && daysUntilExpiration && daysUntilExpiration <= 30
                        ? daysUntilExpiration <= 7 
                          ? 'bg-destructive/10 border border-destructive/30'
                          : 'bg-yellow-500/10 border border-yellow-500/30'
                        : 'bg-muted/50'
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {paymentType === 'one-time' ? 'Validade do Plano' : 'Próxima Cobrança'}
                      </p>
                      <p className="font-medium text-foreground">
                        {format(new Date(subscriptionEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      {paymentType === 'one-time' && daysUntilExpiration !== undefined && (
                        <p className={`text-xs mt-1 ${
                          daysUntilExpiration <= 7 
                            ? 'text-destructive font-medium' 
                            : daysUntilExpiration <= 30 
                              ? 'text-yellow-600 dark:text-yellow-500' 
                              : 'text-muted-foreground'
                        }`}>
                          {daysUntilExpiration > 0 
                            ? `${daysUntilExpiration} dias restantes`
                            : 'Plano expirado'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleManageSubscription} 
                    disabled={isLoadingPortal}
                    variant="outline" 
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {isLoadingPortal ? "Carregando..." : "Gerenciar Assinatura"}
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/cliente/pagamentos">
                      <History className="h-4 w-4 mr-2" />
                      Histórico de Pagamentos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next 12 Payments Calendar */}
            {subscriptionEnd && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próximos 12 Pagamentos
                  </CardTitle>
                  <CardDescription>
                    Calendário de cobranças da sua assinatura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {generateNextPayments(subscriptionEnd).map((date, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg text-center ${
                          index === 0 
                            ? "bg-primary/10 border-2 border-primary/30" 
                            : "bg-muted/50"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {format(date, "MMM", { locale: ptBR }).toUpperCase()}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {format(date, "dd", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, "yyyy", { locale: ptBR })}
                        </p>
                        {index === 0 && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Próximo
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!isSubscribed && (
          <div className="space-y-6">
            {/* Show pending brand creation option if applicable */}
            {onboarding?.needs_brand_creation && !onboarding?.brand_creation_paid && (
              <Card className={`border-2 transition-all ${addBrandCreation ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Criação de Marca</CardTitle>
                        <CardDescription>
                          Você selecionou este serviço no onboarding
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">R$ 150</p>
                      <p className="text-xs text-muted-foreground">pagamento único</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      2 versões + 2 rodadas de correção incluídas
                    </p>
                    <Button
                      variant={addBrandCreation ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAddBrandCreation(!addBrandCreation)}
                    >
                      {addBrandCreation ? "✓ Incluído" : "Adicionar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Regularizar Assinatura
                </CardTitle>
                <CardDescription>
                  Escolha um plano para ativar seu projeto e continuar usando todos os serviços.
                  {addBrandCreation && (
                    <span className="block mt-1 text-primary font-medium">
                      + Criação de Marca será incluída no checkout
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans && Object.entries(plans).map(([planId, plan]) => {
                  // Highlight the plan that was originally selected in onboarding
                  const isOriginalPlan = onboarding?.selected_plan?.toLowerCase() === planId;
                  
                  return (
                    <div 
                      key={planId} 
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isOriginalPlan
                          ? 'border-primary bg-primary/5' 
                          : plan.popular 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{plan.name}</h3>
                            {isOriginalPlan && (
                              <Badge variant="outline" className="border-primary/50 text-primary">
                                Seu plano original
                              </Badge>
                            )}
                            {plan.popular && !isOriginalPlan && (
                              <Badge variant="default" className="bg-primary">
                                Recomendado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.description}
                          </p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            R$ {plan.price}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                          </p>
                        </div>
                        <Button
                          onClick={() => handleSubscribe(planId, plan.price_id)}
                          disabled={isLoadingCheckout === planId}
                          variant={isOriginalPlan || plan.popular ? 'default' : 'outline'}
                          className="ml-4"
                        >
                          {isLoadingCheckout === planId ? 'Carregando...' : 'Assinar'}
                        </Button>
                      </div>
                      
                      {plan.features && plan.features.length > 0 && (
                        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {plan.features.slice(0, 4).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="ghost" asChild>
                <Link to="/cliente/dashboard">
                  Voltar ao Dashboard
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
