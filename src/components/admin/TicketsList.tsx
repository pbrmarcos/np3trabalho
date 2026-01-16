import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Ticket, Loader2, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import TicketDetail from "./TicketDetail";

interface TicketsListProps {
  projectId: string;
  userId: string;
}

interface ProjectTicket {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  in_progress: { label: "Em andamento", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  medium: { label: "Média", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "Alta", color: "bg-amber-500/10 text-amber-600" },
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-600" },
};

export default function TicketsList({ projectId, userId }: TicketsListProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ProjectTicket | null>(null);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["project-tickets", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tickets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectTicket[];
    },
    enabled: !!projectId,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("project_tickets")
        .insert({
          project_id: projectId,
          title: newTicket.title,
          description: newTicket.description || null,
          priority: newTicket.priority,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets", projectId] });
      setNewTicket({ title: "", description: "", priority: "medium" });
      setIsCreating(false);
      toast.success("Ticket criado!");
    },
    onError: () => {
      toast.error("Erro ao criar ticket");
    },
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("project_tickets")
        .update(updateData)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets", projectId] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  if (selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        userId={userId}
        projectId={projectId}
        onBack={() => setSelectedTicket(null)}
        onStatusChange={(status) => {
          updateStatusMutation.mutate({ ticketId: selectedTicket.id, status });
          setSelectedTicket({ ...selectedTicket, status });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Solicitações e chamados do projeto
        </p>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Ticket</DialogTitle>
              <DialogDescription>
                Crie uma nova solicitação ou chamado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newTicket.title}
                  onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Alterar banner do site"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descreva a solicitação em detalhes..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(v) => setNewTicket((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createTicketMutation.mutate()}
                disabled={!newTicket.title || createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Criar Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusInfo = statusConfig[ticket.status] || statusConfig.open;
            const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.medium;

            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground font-mono">#{ticket.id.substring(0, 8)}</span>
                          <h4 className="font-medium text-foreground truncate">{ticket.title}</h4>
                          <Badge className={`text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                          <Badge className={`text-xs ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </Badge>
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-1">Nenhum ticket</h3>
            <p className="text-sm text-muted-foreground">
              Crie tickets para gerenciar solicitações do cliente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
