import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Plus } from "lucide-react";

interface TicketSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Aberto", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: Clock },
  in_progress: { label: "Em Andamento", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", icon: AlertCircle },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-border", icon: CheckCircle },
};

const ITEMS_PER_PAGE = 5;

export default function ClientTicketsSummary() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allTickets, isLoading } = useQuery({
    queryKey: ["client-tickets-summary", user?.id],
    queryFn: async () => {
      const { data: projects, error: projectsError } = await supabase
        .from("client_projects")
        .select("id")
        .eq("client_id", user?.id);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("project_tickets")
        .select("id, title, status, priority, project_id, created_at, updated_at")
        .in("project_id", projectIds)
        .order("updated_at", { ascending: false });

      if (ticketsError) throw ticketsError;
      return ticketsData as TicketSummary[];
    },
    enabled: !!user?.id,
  });

  const { data: projects } = useQuery({
    queryKey: ["client-projects-map", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("id, name")
        .eq("client_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const projectMap = projects?.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const totalTickets = allTickets?.length || 0;
  const totalPages = Math.ceil(totalTickets / ITEMS_PER_PAGE);
  const tickets = allTickets?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || [];

  const openTickets = allTickets?.filter(t => t.status === "open" || t.status === "in_progress").length || 0;
  const resolvedTickets = allTickets?.filter(t => t.status === "resolved").length || 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const firstProjectId = projects?.[0]?.id;

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minhas Solicitações
          </CardTitle>
          {firstProjectId && (
            <Link to={`/cliente/projeto/${firstProjectId}/tickets`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Ticket</span>
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumo */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{openTickets}</span> em aberto
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{resolvedTickets}</span> resolvidos
            </span>
          </div>
        </div>

        {tickets && tickets.length > 0 ? (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status]?.icon || Clock;
              return (
                <Link
                  key={ticket.id}
                  to={`/cliente/projeto/${ticket.project_id}/tickets`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">#{ticket.id.substring(0, 8)}</span> • {projectMap[ticket.project_id] || "Projeto"} • {formatDate(ticket.updated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig[ticket.status]?.color}`}>
                        <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                        {statusConfig[ticket.status]?.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma solicitação ainda
            </p>
            {firstProjectId && (
              <Link to={`/cliente/projeto/${firstProjectId}/tickets`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Ticket
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
