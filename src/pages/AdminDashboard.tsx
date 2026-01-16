import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Home, BarChart3, Building2, Phone, ArrowRight, Loader2, Plus, Globe, FolderOpen, Ticket, Settings, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DemandsPanel } from "@/components/admin/DemandsPanel";
import { useDemandsNotifications } from "@/hooks/useDemandsNotifications";
import ErrorState from "@/components/ErrorState";
import { perfMonitor } from "@/lib/performanceMonitor";
import { EmailStatusAlert } from "@/components/admin/EmailStatusAlert";

interface ClientOnboarding {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  whatsapp: string;
  selected_plan: string;
  created_at: string;
  needs_brand_creation: boolean;
  brand_status: string | null;
}

interface ClientProject {
  id: string;
  client_id: string;
  name: string;
  status: string;
  domain: string | null;
  plan: string;
  created_at: string;
}


const statusConfig: Record<string, { label: string; color: string }> = {
  development: { label: "Em desenvolvimento", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  active: { label: "Ativo", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  pending: { label: "Pendente", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  suspended: { label: "Suspenso", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const planLabels: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  performance: "Performance",
  basic: "Essencial",
  professional: "Profissional",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Enable demand deadline notifications
  useDemandsNotifications();

  const { data: allOnboardings, isLoading: loadingOnboardings, isError: onboardingsError, refetch: refetchOnboardings } = useQuery({
    queryKey: ["admin-all-onboardings"],
    queryFn: async () => {
      return perfMonitor.measureAsync("AdminDashboard:onboardings", async () => {
        const { data, error } = await supabase
          .from("client_onboarding")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return data as ClientOnboarding[];
      });
    },
    staleTime: 1000 * 30,
  });

  const { data: projects, isLoading: loadingProjects, isError: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ["admin-all-projects"],
    queryFn: async () => {
      return perfMonitor.measureAsync("AdminDashboard:projects", async () => {
        const { data, error } = await supabase
          .from("client_projects")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return data as ClientProject[];
      });
    },
    staleTime: 1000 * 30,
  });

  // Critical error handling
  const hasCriticalError = onboardingsError || projectsError;
  
  const handleRetry = () => {
    if (onboardingsError) refetchOnboardings();
    if (projectsError) refetchProjects();
  };

  const { data: openTicketsCount } = useQuery({
    queryKey: ["admin-open-tickets-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("project_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingMigrationsCount } = useQuery({
    queryKey: ["admin-pending-migrations-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("migration_requests").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress", "contacted"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: clientsCount }, { count: postsCount }] = await Promise.all([
        supabase.from("client_onboarding").select("*", { count: "exact", head: true }),
        supabase.from("blog_posts").select("*", { count: "exact", head: true }),
      ]);
      return { totalClients: clientsCount || 0, blogPosts: postsCount || 0, openTickets: openTicketsCount || 0 };
    },
    enabled: !!projects,
  });

  const onboardingsWithoutProject = allOnboardings?.filter((o) => !projects?.some((p) => p.client_id === o.user_id)) || [];
  const isLoading = loadingOnboardings || loadingProjects;

  // Show error state for critical failures
  if (hasCriticalError) {
    return (
      <AdminLayoutWithSidebar showNotifications>
        <ErrorState
          title="Erro ao carregar dados"
          message="Não foi possível carregar as informações do painel administrativo. Verifique sua conexão e tente novamente."
          onRetry={handleRetry}
          showBackButton
        />
      </AdminLayoutWithSidebar>
    );
  }

  return (
    <AdminLayoutWithSidebar showNotifications>
      {/* Email Status Alert */}
      <div className="mb-4">
        <EmailStatusAlert />
      </div>

      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1 md:mb-2">Painel Administrativo</h1>
        <p className="text-sm md:text-base text-muted-foreground">Gerencie clientes, projetos e conteúdo do site.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card><CardContent className="p-4 md:p-6"><div className="flex items-center gap-3 md:gap-4"><div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-4 w-4 md:h-5 md:w-5 text-primary" /></div><div><p className="text-xl md:text-2xl font-bold text-foreground">{stats?.totalClients || 0}</p><p className="text-xs md:text-sm text-muted-foreground">Clientes</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4 md:p-6"><div className="flex items-center gap-3 md:gap-4"><div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"><BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-green-500" /></div><div><p className="text-xl md:text-2xl font-bold text-foreground">{projects?.length || 0}</p><p className="text-xs md:text-sm text-muted-foreground">Projetos</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4 md:p-6"><div className="flex items-center gap-3 md:gap-4"><div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-500" /></div><div><p className="text-xl md:text-2xl font-bold text-foreground">{stats?.blogPosts || 0}</p><p className="text-xs md:text-sm text-muted-foreground">Posts</p></div></div></CardContent></Card>
        <Link to="/admin/tickets"><Card className="hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="p-4 md:p-6"><div className="flex items-center gap-3 md:gap-4"><div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Ticket className="h-4 w-4 md:h-5 md:w-5 text-amber-500" /></div><div><p className="text-xl md:text-2xl font-bold text-foreground">{openTicketsCount || 0}</p><p className="text-xs md:text-sm text-muted-foreground">Tickets</p></div></div></CardContent></Card></Link>
        <Link to="/admin/migrations"><Card className="hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="p-4 md:p-6"><div className="flex items-center gap-3 md:gap-4"><div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"><RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-purple-500" /></div><div><p className="text-xl md:text-2xl font-bold text-foreground">{pendingMigrationsCount || 0}</p><p className="text-xs md:text-sm text-muted-foreground">Migrações</p></div></div></CardContent></Card></Link>
      </div>

      {/* Demands Panel - Central de Demandas */}
      <div className="mb-8">
        <DemandsPanel />
      </div>

      {/* New Onboardings */}
      {onboardingsWithoutProject.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><Plus className="h-5 w-5 text-amber-500" />Novos Onboardings<Badge variant="secondary" className="ml-2">{onboardingsWithoutProject.length}</Badge></h2>
          <div className="grid gap-3">
            {onboardingsWithoutProject.slice(0, 5).map((client) => (
              <Card key={client.id} className="group border-amber-500/30 hover:border-amber-500/50 transition-colors">
                <CardContent className="p-4"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-5 w-5 text-amber-500" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-medium text-foreground truncate">{client.company_name}</h3><Badge variant="secondary" className="text-xs capitalize">{client.business_type}</Badge></div><div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.whatsapp}</span></div></div><Button size="sm" onClick={() => navigate(`/admin/create-project/${client.id}`)}><Plus className="h-4 w-4 mr-1" />Criar Projeto</Button></div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" />Projetos Ativos</h2><Link to="/admin/clients"><Button variant="ghost" size="sm">Ver todos<ArrowRight className="h-4 w-4 ml-1" /></Button></Link></div>
        {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : projects && projects.length > 0 ? (
          <div className="grid gap-3">{projects.slice(0, 5).map((project) => { const statusInfo = statusConfig[project.status] || statusConfig.pending; return (<Card key={project.id} className="group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/projects/${project.id}`)}><CardContent className="p-4"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Globe className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-medium text-foreground truncate">{project.name}</h3><Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge></div><div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">{project.domain && <><span>{project.domain}</span><span>•</span></>}<span>Criado em {new Date(project.created_at).toLocaleDateString("pt-BR")}</span></div></div><ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" /></div></CardContent></Card>); })}</div>
        ) : <Card><CardContent className="p-6 text-center"><FolderOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhum projeto criado ainda.</p></CardContent></Card>}
      </div>

      {/* Quick Actions */}
      <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Gerenciamento</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer"><CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6"><div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0"><Home className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div><div><h3 className="font-medium text-foreground text-sm md:text-base">Editar Home</h3><p className="text-xs md:text-sm text-muted-foreground truncate">Alterar textos</p></div></CardContent></Card>
        <Link to="/admin/blog"><Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6"><div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0"><FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div><div><h3 className="font-medium text-foreground text-sm md:text-base">Gerenciar Blog</h3><p className="text-xs md:text-sm text-muted-foreground truncate">Criar e editar</p></div></CardContent></Card></Link>
        <Link to="/admin/clients"><Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6"><div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0"><Users className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div><div><h3 className="font-medium text-foreground text-sm md:text-base">Clientes</h3><p className="text-xs md:text-sm text-muted-foreground truncate">Visualizar todos</p></div></CardContent></Card></Link>
        <Link to="/admin/settings"><Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6"><div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0"><Settings className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div><div><h3 className="font-medium text-foreground text-sm md:text-base">Configurações</h3><p className="text-xs md:text-sm text-muted-foreground truncate">Planos e Stripe</p></div></CardContent></Card></Link>
        <Link to="/admin/tickets"><Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full"><CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6"><div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0"><Ticket className="h-5 w-5 md:h-6 md:w-6 text-amber-500" /></div><div><h3 className="font-medium text-foreground text-sm md:text-base">Tickets</h3><p className="text-xs md:text-sm text-muted-foreground truncate">Central de suporte</p></div></CardContent></Card></Link>
      </div>
    </AdminLayoutWithSidebar>
  );
}
