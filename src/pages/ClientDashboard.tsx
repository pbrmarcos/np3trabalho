import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, AlertTriangle, User, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ClientLayout from "@/components/ClientLayout";
import ClientServiceSummary from "@/components/ClientServiceSummary";
import ClientTimeline from "@/components/ClientTimeline";
import ClientProjectSummary from "@/components/ClientProjectSummary";
import ClientProjectData from "@/components/ClientProjectData";
import ClientQuickActions from "@/components/ClientQuickActions";
import ClientTicketsSummary from "@/components/ClientTicketsSummary";
import ClientAlerts from "@/components/ClientAlerts";
import ClientDesignServiceCard from "@/components/ClientDesignServiceCard";
import EmailConfirmationAlert from "@/components/EmailConfirmationAlert";
import ErrorState from "@/components/ErrorState";
import MessagePopup from "@/components/MessagePopup";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";

const migrationStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600" },
  in_contact: { label: "Em Contato", color: "bg-blue-500/10 text-blue-600" },
  analyzing: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600" },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600" },
  in_progress: { label: "Em Andamento", color: "bg-orange-500/10 text-orange-600" },
  completed: { label: "Concluída", color: "bg-emerald-500/10 text-emerald-600" },
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const emailConfirmed = !!user?.email_confirmed_at;
  const { isSubscribed, planName, subscriptionEnd, paymentType, daysUntilExpiration, isLoading: subLoading, refresh } = useSubscription();

  // Enable realtime notifications for admin messages
  useRealtimeMessages({ userId: user?.id, enabled: !!user?.id });

  const { data: projects, isLoading, isError: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ["client-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("client_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: onboarding, isLoading: onboardingLoading, isError: onboardingError, refetch: refetchOnboarding } = useQuery({
    queryKey: ["client-onboarding", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Show error state if critical data fails to load
  const hasCriticalError = projectsError || onboardingError;

  const handleRetry = () => {
    if (projectsError) refetchProjects();
    if (onboardingError) refetchOnboarding();
  };

  // Check if user has migration request
  const { data: migrationRequest } = useQuery({
    queryKey: ["client-migration-request", user?.email],
    queryFn: async () => {
      // First check migration_requests table
      const { data: migration } = await supabase
        .from("migration_requests")
        .select("id, status, current_domain")
        .eq("email", user?.email || "")
        .not("status", "in", "(completed,cancelled)")
        .limit(1)
        .maybeSingle();
      
      if (migration) return migration;

      // Check if needs_migration in onboarding
      if (onboarding?.needs_migration) {
        return { 
          status: "pending", 
          current_domain: onboarding.migration_current_domain,
          fromOnboarding: true 
        };
      }
      
      return null;
    },
    enabled: !!user?.email && !onboardingLoading,
  });

  // Fetch unread messages for popup - poll every 5s for quick detection
  const { data: latestUnreadMessage } = useQuery({
    queryKey: ["client-latest-unread-message", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_messages")
        .select("id, message, message_type, created_at, read_at, project_id")
        .eq("client_id", user?.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const mainProject = projects?.[0];

  // Show error state for critical failures
  if (hasCriticalError) {
    return (
      <ClientLayout>
        <ErrorState
          title="Não foi possível carregar seus dados"
          message="Ocorreu um erro ao carregar as informações do seu painel. Isso pode ser um problema temporário."
          onRetry={handleRetry}
          showHomeButton
        />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      {/* Email Confirmation Alert - Only show if not confirmed */}
      {user?.email && !emailConfirmed && (
        <EmailConfirmationAlert email={user.email} />
      )}

      {/* Important Alerts */}
      {user?.id && (
        <ClientAlerts 
          userId={user.id} 
          isSubscribed={isSubscribed}
          isLoadingSubscription={subLoading}
          subscriptionEnd={subscriptionEnd}
          paymentType={paymentType}
          daysUntilExpiration={daysUntilExpiration}
          onboarding={onboarding}
        />
      )}

      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-1">
          Olá, bem-vindo de volta!
        </h1>
        <p className="text-sm text-muted-foreground">
          {onboarding ? "Acompanhe seu projeto e gerencie seus serviços" : "Explore nossos serviços de design digital"}
        </p>
      </div>

      {/* Service Summary - Only show if has onboarding (hosting plan) */}
      {onboardingLoading || subLoading ? (
        <Skeleton className="h-[200px] w-full mb-6" />
      ) : onboarding ? (
        <div className="mb-6">
          <ClientServiceSummary
            selectedPlan={onboarding.selected_plan}
            isSubscribed={isSubscribed}
            planName={planName}
            subscriptionEnd={null}
            needsBrandCreation={onboarding.needs_brand_creation}
            brandCreationPaid={onboarding.brand_creation_paid}
            onRefreshSubscription={refresh}
            isRefreshing={subLoading}
          />
        </div>
      ) : (
        /* Welcome card for design-only clients */
        <div className="mb-6 p-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Bem-vindo à WebQ!
              </h2>
              <p className="text-muted-foreground text-sm">
                Você pode comprar serviços de design digital a qualquer momento. 
                Sem mensalidades, pague apenas pelo que precisar.
              </p>
            </div>
            <Link to="/design/checkout">
              <Button>
                <Rocket className="mr-2 h-4 w-4" />
                Fazer Pedido de Design
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Column - Timeline */}
        <div className="space-y-6">
          {/* Project Summary */}
          {isLoading ? (
            <Skeleton className="h-[100px] w-full" />
          ) : mainProject ? (
            <ClientProjectSummary project={mainProject} />
          ) : onboarding ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-green-500/30 rounded-lg bg-green-500/10">
              <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Rocket className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                Seu projeto está sendo iniciado!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 text-center max-w-md mb-6">
                Nossa equipe já está trabalhando no seu projeto. Se precisarmos de mais informações, entraremos em contato nas próximas 24 horas.
              </p>
              
              <div className="flex flex-col items-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 max-w-md w-full">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    Confirme se seus dados para contato estão corretos.
                  </p>
                </div>
                <Link to="/cliente/conta">
                  <Button size="sm" variant="outline" className="gap-2 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/10">
                    <User className="h-4 w-4" />
                    Verificar meus dados
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}

          {/* Project Data - Below project summary, above timeline */}
          {onboarding && <ClientProjectData onboarding={onboarding} />}

          {/* Timeline */}
          {user?.id && <ClientTimeline userId={user.id} />}
        </div>

        {/* Right Column - Quick Actions & Tickets */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <ClientQuickActions projectId={mainProject?.id} />

          {/* Migration Status Card */}
          {migrationRequest && (
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-teal-500" />
                  Migração de Site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {migrationRequest.current_domain || "Domínio não informado"}
                  </span>
                  <Badge className={migrationStatusConfig[migrationRequest.status]?.color || "bg-muted"}>
                    {migrationStatusConfig[migrationRequest.status]?.label || migrationRequest.status}
                  </Badge>
                </div>
                <Link to="/cliente/migracao">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Acompanhar Migração
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Design Service Card */}
          {user?.id && <ClientDesignServiceCard userId={user.id} />}

          {/* Recent Tickets */}
          <ClientTicketsSummary />
        </div>
      </div>

      {/* Message Popup */}
      {latestUnreadMessage && (
        <MessagePopup 
          message={latestUnreadMessage} 
          projectId={latestUnreadMessage.project_id || mainProject?.id || ""} 
        />
      )}
    </ClientLayout>
  );
}
