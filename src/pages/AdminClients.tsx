import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Building2, Phone, Globe, Palette, Plus, FolderOpen, Cloud, Trash2, Filter, UserPlus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import DesignOnlyClients from "@/components/admin/DesignOnlyClients";
import ErrorState from "@/components/ErrorState";

const migrationStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  in_contact: { label: "Em Contato", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  analyzing: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  in_progress: { label: "Em Andamento", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  completed: { label: "Concluída", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

const planLabels: Record<string, string> = { 
  essencial: "Essencial", 
  profissional: "Profissional", 
  performance: "Performance", 
  basic: "Essencial", 
  professional: "Profissional" 
};

const businessTypeLabels: Record<string, string> = { 
  advogado: "Advogado", 
  saude: "Saúde", 
  construcao: "Construção", 
  restaurante: "Restaurante", 
  beleza: "Beleza", 
  educacao: "Educação", 
  outro: "Outro" 
};

const statusConfig: Record<string, { label: string; color: string }> = { 
  development: { label: "Em desenvolvimento", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }, 
  active: { label: "Ativo", color: "bg-green-500/10 text-green-600 dark:text-green-400" }, 
  pending: { label: "Pendente", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }, 
  suspended: { label: "Suspenso", color: "bg-red-500/10 text-red-600 dark:text-red-400" } 
};

export default function AdminClients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Debounce search for server-side filtering
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Server-side search with debounced query
  const { data: onboardings, isLoading: loadingOnboardings, error: onboardingsError, refetch: refetchOnboardings } = useQuery({ 
    queryKey: ["admin-onboardings", debouncedSearch, planFilter], 
    queryFn: async () => { 
      let query = supabase
        .from("client_onboarding")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Server-side search using ilike
      if (debouncedSearch) {
        query = query.or(`company_name.ilike.%${debouncedSearch}%,whatsapp.ilike.%${debouncedSearch}%,business_type.ilike.%${debouncedSearch}%`);
      }
      
      // Filter by plan
      if (planFilter !== "all") {
        query = query.eq("selected_plan", planFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error; 
      return data; 
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: projects, isLoading: loadingProjects, error: projectsError } = useQuery({ 
    queryKey: ["admin-projects"], 
    queryFn: async () => { 
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .order("created_at", { ascending: false }); 
      if (error) throw error; 
      return data; 
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch migration requests to show status on client cards
  const { data: migrationRequests } = useQuery({
    queryKey: ["admin-migration-requests-for-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_requests")
        .select("id, email, current_domain, status")
        .not("status", "in", "(completed,cancelled)");
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Also check onboarding migration requests
  const getMigrationForClient = (onboarding: any) => {
    if (!onboarding.needs_migration) return null;
    // Try to find matching migration request by domain or email
    const domain = onboarding.migration_current_domain?.toLowerCase();
    const match = migrationRequests?.find(
      m => m.current_domain?.toLowerCase() === domain
    );
    if (match) return match;
    // Return onboarding migration status if no separate request
    return { status: "pending", fromOnboarding: true };
  };

  const handleCleanupOrphanUsers = async () => {
    if (!confirm("Isso irá deletar todos os usuários sem role (clientes órfãos). Continuar?")) return;
    setIsCleaningUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      
      const { data, error } = await supabase.functions.invoke("cleanup-orphan-users", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      toast.success(data.message || "Limpeza concluída");
      queryClient.invalidateQueries({ queryKey: ["admin-onboardings"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao limpar usuários");
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Client-side filter by project status (since status is on projects table)
  const filteredOnboardings = onboardings?.filter(o => {
    if (statusFilter === "all") return true;
    const project = projects?.find(p => p.client_id === o.user_id);
    const projectStatus = project?.status || "pending";
    return projectStatus === statusFilter;
  });

  const getProjectForClient = (userId: string) => projects?.find(p => p.client_id === userId);
  const isLoading = loadingOnboardings || loadingProjects;
  const isDeveloper = user?.email === "desenvolvedor@webq.com.br";

  // Pagination
  const pagination = usePagination(filteredOnboardings, { pageSize: 20 });

  // Count design-only clients
  const { data: designOnlyCount } = useQuery({
    queryKey: ["design-only-count"],
    queryFn: async () => {
      const { data: clientRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (!clientRoles) return 0;

      const { data: onboardings } = await supabase
        .from("client_onboarding")
        .select("user_id");

      const onboardingIds = new Set(onboardings?.map(o => o.user_id) || []);
      return clientRoles.filter(r => !onboardingIds.has(r.user_id)).length;
    },
    staleTime: 60000,
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Clientes" }
  ];

  // Stats
  const stats = {
    total: onboardings?.length || 0,
    development: onboardings?.filter(o => {
      const p = projects?.find(p => p.client_id === o.user_id);
      return p?.status === 'development';
    }).length || 0,
    active: onboardings?.filter(o => {
      const p = projects?.find(p => p.client_id === o.user_id);
      return p?.status === 'active';
    }).length || 0,
    pending: onboardings?.filter(o => {
      const p = projects?.find(p => p.client_id === o.user_id);
      return !p || p.status === 'pending';
    }).length || 0,
    designOnly: designOnlyCount || 0,
  };

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="mb-6 md:mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1 md:mb-2 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {stats.total} com hospedagem • {stats.designOnly} design-only • {stats.active} ativos
          </p>
        </div>
        {isDeveloper && (
          <Button variant="destructive" size="sm" onClick={handleCleanupOrphanUsers} disabled={isCleaningUp}>
            <Trash2 className="h-4 w-4 mr-1" />
            {isCleaningUp ? "Limpando..." : "Limpar Órfãos"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="hosting" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hosting" className="gap-2">
            <Globe className="h-4 w-4" />
            Hospedagem ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="design-only" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Design-Only ({stats.designOnly})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hosting" className="space-y-6">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, WhatsApp ou ramo..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusConfig).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Planos</SelectItem>
            <SelectItem value="essencial">Essencial</SelectItem>
            <SelectItem value="profissional">Profissional</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(onboardingsError || projectsError) ? (
        <ErrorState
          title="Erro ao carregar clientes"
          message="Não foi possível carregar a lista de clientes. Verifique sua conexão e tente novamente."
          onRetry={() => refetchOnboardings()}
          variant="compact"
        />
      ) : isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pagination.paginatedData.length > 0 ? (
        <>
          <div className="grid gap-4">
            {pagination.paginatedData.map(client => { 
              const project = getProjectForClient(client.user_id); 
              const status = project?.status || "pending"; 
              const statusInfo = statusConfig[status] || statusConfig.pending; 

              return (
                <Card key={client.id} className="group hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground truncate">{client.company_name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {businessTypeLabels[client.business_type] || client.business_type}
                            </Badge>
                            <Badge className={`text-xs ${statusInfo.color}`}>
                              {statusInfo.label}
                            </Badge>
                            {project?.cloud_drive_url && (
                              <Badge className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <Cloud className="h-3 w-3 mr-1" />
                                Drive
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.whatsapp}
                            </span>
                            {client.domain_name && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {client.domain_name}
                              </span>
                            )}
                            {client.needs_brand_creation && (
                              <span className="flex items-center gap-1 text-primary">
                                <Palette className="h-3 w-3" />
                                Criação de marca
                              </span>
                            )}
                            {client.needs_migration && (
                              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                                <RefreshCw className="h-3 w-3" />
                                Migração
                              </span>
                            )}
                          </div>
                          {/* Migration Status Badge */}
                          {(() => {
                            const migration = getMigrationForClient(client);
                            if (!migration) return null;
                            const statusInfo = migrationStatusConfig[migration.status] || migrationStatusConfig.pending;
                            return (
                              <Badge className={`text-xs mt-1 ${statusInfo.color}`}>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Migração: {statusInfo.label}
                              </Badge>
                            );
                          })()}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              Plano {planLabels[client.selected_plan] || client.selected_plan}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Cadastrado em {new Date(client.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:ml-auto">
                        {project ? (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/projects/${project.id}`)}>
                            <FolderOpen className="h-3 w-3 mr-1" />
                            Gerenciar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => navigate(`/admin/create-project/${client.id}`)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Criar Projeto
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            window.open(`https://wa.me/55${client.whatsapp.replace(/\D/g, "")}`, "_blank"); 
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ); 
            })}
          </div>

          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-1">Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || planFilter !== "all" 
                ? "Tente ajustar os filtros." 
                : "Os clientes aparecerão aqui após se cadastrarem."}
            </p>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="design-only">
          <DesignOnlyClients />
        </TabsContent>
      </Tabs>
    </AdminLayoutWithSidebar>
  );
}
