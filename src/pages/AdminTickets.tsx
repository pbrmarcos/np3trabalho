import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Search, Filter, Clock, AlertCircle, CheckCircle2, XCircle, Building2, ArrowRight } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TicketDetail from "@/components/admin/TicketDetail";
import { toast } from "sonner";
import { notifyTicketStatusChange } from "@/services/notificationService";
import { logTicketAction } from "@/services/auditService";
import { useAuth } from "@/hooks/useAuth";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import ErrorState from "@/components/ErrorState";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open: { label: "Aberto", icon: AlertCircle, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  in_progress: { label: "Em andamento", icon: Clock, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  resolved: { label: "Resolvido", icon: CheckCircle2, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  closed: { label: "Fechado", icon: XCircle, color: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  medium: { label: "Média", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  high: { label: "Alta", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

interface TicketWithMeta {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  created_by: string;
  project_id: string;
  project_name: string;
  client_name: string;
}

export default function AdminTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Server-side search with optimized query
  const { data: tickets, isLoading, error: ticketsError, refetch: refetchTickets } = useQuery({
    queryKey: ["admin-all-tickets", debouncedSearch, statusFilter, priorityFilter],
    queryFn: async () => {
      // Build ticket query with server-side filters
      let ticketQuery = supabase
        .from("project_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Server-side status filter
      if (statusFilter !== "all") {
        ticketQuery = ticketQuery.eq("status", statusFilter);
      }
      
      // Server-side priority filter
      if (priorityFilter !== "all") {
        ticketQuery = ticketQuery.eq("priority", priorityFilter);
      }
      
      // Server-side search on title
      if (debouncedSearch) {
        ticketQuery = ticketQuery.ilike("title", `%${debouncedSearch}%`);
      }

      const { data: ticketsData, error } = await ticketQuery;
      if (error) throw error;
      if (!ticketsData || ticketsData.length === 0) return [];

      // Batch fetch related data
      const projectIds = [...new Set(ticketsData.map(t => t.project_id))];
      const { data: projectsData } = await supabase
        .from("client_projects")
        .select("id, name, client_id")
        .in("id", projectIds);

      const clientIds = [...new Set(projectsData?.map(p => p.client_id) || [])];
      const { data: onboardingsData } = await supabase
        .from("client_onboarding")
        .select("user_id, company_name")
        .in("user_id", clientIds);

      const projectsMap = new Map(projectsData?.map(p => [p.id, p]) || []);
      const clientsMap = new Map(onboardingsData?.map(o => [o.user_id, o.company_name]) || []);

      return ticketsData.map(ticket => { 
        const project = projectsMap.get(ticket.project_id); 
        return { 
          ...ticket, 
          project_name: project?.name || "Projeto", 
          client_name: project ? (clientsMap.get(project.client_id) || "Cliente") : "Cliente" 
        }; 
      }) as TicketWithMeta[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId && tickets) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [searchParams, tickets]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("project_tickets")
        .update({ 
          status: newStatus,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null
        })
        .eq("id", ticketId);
      if (error) throw error;
      return { ticketId, newStatus };
    },
    onSuccess: async ({ ticketId, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-tickets"] });
      
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
        
        // Audit log
        await logTicketAction(ticketId, selectedTicket.title, 'status_change', `Status alterado para "${newStatus}"`, {
          oldValue: { status: selectedTicket.status },
          newValue: { status: newStatus },
          metadata: { project_id: selectedTicket.project_id }
        });
        
        try {
          await notifyTicketStatusChange(
            selectedTicket.created_by,
            selectedTicket.title,
            newStatus,
            ticketId,
            selectedTicket.project_id
          );
        } catch (notifyError) {
          console.error("Error sending notification:", notifyError);
        }
      }
      
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (selectedTicket) {
      updateStatusMutation.mutate({ ticketId: selectedTicket.id, newStatus });
    }
  };

  const handleSelectTicket = (ticket: TicketWithMeta) => {
    setSelectedTicket(ticket);
    setSearchParams({ ticket: ticket.id });
  };

  const handleBack = () => {
    setSelectedTicket(null);
    setSearchParams({});
  };

  // Pagination
  const pagination = usePagination(tickets, { pageSize: 20 });

  // Get status counts from all tickets (separate query for stats)
  const { data: allTickets } = useQuery({
    queryKey: ["admin-tickets-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tickets")
        .select("status");
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const statusCounts = allTickets?.reduce((acc, ticket) => { 
    acc[ticket.status] = (acc[ticket.status] || 0) + 1; 
    return acc; 
  }, {} as Record<string, number>) || {};

  const breadcrumbs = selectedTicket 
    ? [
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Tickets", href: "/admin/tickets" },
        { label: `#${selectedTicket.id.substring(0, 8)}` }
      ]
    : [
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Tickets" }
      ];

  if (selectedTicket && user) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs} showNotifications>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{selectedTicket.client_name}</span> • {selectedTicket.project_name}
          </p>
        </div>
        <TicketDetail
          ticket={selectedTicket}
          userId={user.id}
          projectId={selectedTicket.project_id}
          onBack={handleBack}
          onStatusChange={handleStatusChange}
        />
      </AdminLayoutWithSidebar>
    );
  }

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs} showNotifications>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1">
            Central de Tickets
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Todos os tickets de suporte
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {Object.entries(statusConfig).map(([status, config]) => { 
          const Icon = config.icon; 
          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-colors ${statusFilter === status ? 'ring-2 ring-primary' : ''}`} 
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{statusCounts[status] || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ); 
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(priorityConfig).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ticketsError ? (
        <ErrorState
          title="Erro ao carregar tickets"
          message="Não foi possível carregar a lista de tickets. Verifique sua conexão e tente novamente."
          onRetry={() => refetchTickets()}
          variant="compact"
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pagination.paginatedData.length > 0 ? (
        <>
          <div className="space-y-3">
            {pagination.paginatedData.map(ticket => { 
              const statusInfo = statusConfig[ticket.status] || statusConfig.open; 
              const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.medium; 
              const StatusIcon = statusInfo.icon; 

              return (
                <Card 
                  key={ticket.id} 
                  className="group hover:border-primary/50 transition-colors cursor-pointer" 
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${statusInfo.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground font-mono">
                            #{ticket.id.substring(0, 8)}
                          </span>
                          <h3 className="font-medium text-foreground">{ticket.title}</h3>
                          <Badge className={`text-xs ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {ticket.client_name}
                          </span>
                          <span>•</span>
                          <span>{ticket.project_name}</span>
                          <span>•</span>
                          <span>{format(new Date(ticket.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
          <CardContent className="p-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum ticket encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all" 
                ? "Tente ajustar os filtros." 
                : "Os tickets aparecerão aqui."}
            </p>
          </CardContent>
        </Card>
      )}
    </AdminLayoutWithSidebar>
  );
}
