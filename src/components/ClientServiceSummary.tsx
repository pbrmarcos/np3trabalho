import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Crown, Palette, Settings, RefreshCw, ChevronDown } from "lucide-react";
import { usePlans, getPlanByProjectPlan } from "@/hooks/usePlans";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClientServiceSummaryProps {
  selectedPlan: string;
  isSubscribed: boolean;
  planName: string | null;
  subscriptionEnd?: string | null;
  needsBrandCreation?: boolean;
  brandCreationPaid?: boolean;
  onRefreshSubscription: () => void;
  isRefreshing?: boolean;
}

const planFeatures: Record<string, string[]> = {
  basic: [
    "Site one-page responsivo",
    "Hospedagem incluída",
    "3 contas de email",
    "10GB NVMe de armazenamento",
    "Certificado SSL",
    "Suporte por email",
  ],
  professional: [
    "Site multi-páginas (até 5)",
    "Hospedagem premium",
    "5 contas de email",
    "20GB NVMe de armazenamento",
    "Blog integrado",
    "SEO avançado",
    "Suporte WhatsApp prioritário",
  ],
  performance: [
    "Site multi-páginas (até 10)",
    "Infraestrutura otimizada (CDN)",
    "E-mails ilimitados",
    "50GB NVMe de armazenamento",
    "Blog integrado",
    "SEO técnico + Core Web Vitals",
    "Landing pages ilimitadas",
    "Relatórios mensais",
  ],
};

export default function ClientServiceSummary({
  selectedPlan,
  isSubscribed,
  planName,
  subscriptionEnd,
  needsBrandCreation,
  brandCreationPaid,
  onRefreshSubscription,
  isRefreshing,
}: ClientServiceSummaryProps) {
  const { user } = useAuth();
  const { data: plans, isLoading } = usePlans();
  const [isOpen, setIsOpen] = useState(false);

  const { data: brandOrder } = useQuery({
    queryKey: ['brand-design-order', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_orders')
        .select('id')
        .eq('client_id', user?.id)
        .eq('package_id', 'pkg-brand-creation')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && needsBrandCreation && brandCreationPaid,
  });

  const currentPlan = getPlanByProjectPlan(plans, selectedPlan);
  const normalizedPlanKey = selectedPlan?.toLowerCase().replace(/\s+/g, "").replace(/-/g, "") || "basic";
  const planKey = normalizedPlanKey === "essencial" ? "basic" : 
                  normalizedPlanKey === "profissional" ? "professional" : 
                  normalizedPlanKey;
  const features = planFeatures[planKey] || planFeatures.basic;

  if (isLoading) {
    return <Skeleton className="h-[80px] w-full" />;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  isSubscribed 
                    ? "bg-primary/10" 
                    : "bg-yellow-500/10"
                }`}>
                  <Crown className={`h-5 w-5 ${isSubscribed ? "text-primary" : "text-yellow-500"}`} />
                </div>
                
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {currentPlan?.name || planName || selectedPlan || "Essencial"}
                      </h3>
                      <Badge 
                        variant={isSubscribed ? "default" : "secondary"}
                        className={isSubscribed 
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-xs" 
                          : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs"
                        }
                      >
                        {isSubscribed ? "Ativo" : "Pendente"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      R${currentPlan?.price || 149}/mês
                      {subscriptionEnd && isSubscribed && (
                        <span className="ml-2">• Renova em {formatDate(subscriptionEnd)}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshSubscription();
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0 border-t border-border">
            <div className="grid md:grid-cols-[280px_1fr] gap-0">
              {/* Plan Card */}
              <div className={`p-6 flex flex-col justify-between ${
                isSubscribed 
                  ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" 
                  : "bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent"
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className={`h-5 w-5 ${isSubscribed ? "text-primary" : "text-yellow-500"}`} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Seu Plano
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-display font-bold text-foreground mb-1">
                    {currentPlan?.name || planName || selectedPlan || "Essencial"}
                  </h3>
                  
                  <p className="text-3xl font-bold text-foreground">
                    R${currentPlan?.price || 149}
                    <span className="text-base font-normal text-muted-foreground">/mês</span>
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isSubscribed ? "default" : "secondary"}
                      className={isSubscribed 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
                        : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                      }
                    >
                      {isSubscribed ? "● Ativo" : "○ Pendente"}
                    </Badge>
                  </div>
                  
                  {subscriptionEnd && isSubscribed && (
                    <p className="text-xs text-muted-foreground">
                      Renova em: {formatDate(subscriptionEnd)}
                    </p>
                  )}

                  <Link to="/cliente/assinatura">
                    <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
                      <Settings className="h-4 w-4" />
                      Gerenciar Assinatura
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Features List */}
              <div className="p-6 border-t md:border-t-0 md:border-l border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                  O que está incluso
                </h4>
                
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                  
                  {needsBrandCreation && brandCreationPaid && (
                    <Link 
                      to={brandOrder ? `/cliente/design/${brandOrder.id}` : "/cliente/marca"} 
                      className="flex items-center gap-2 hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded transition-colors group"
                    >
                      <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                        <Palette className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        Criação de Marca
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] ml-1 border-primary/30 text-primary"
                      >
                        Contratado
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
