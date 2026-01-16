import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { notifyAllAdminsNewTicket, notifyAllAdminsClientMessage } from "@/services/notificationService";
import ClientLayout from "@/components/ClientLayout";
import { logTicketAction } from "@/services/auditService";

interface ProjectTicket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
}

const ticketCategories = [
  { value: "alteracao_site", label: "Alteração no Site", description: "Modificar conteúdo, imagens ou layout" },
  { value: "criar_email", label: "Criar Novo E-mail", description: "Solicitar criação de nova conta de e-mail" },
  { value: "alterar_senha_email", label: "Alterar Senha de E-mail", description: "Redefinir senha de conta de e-mail" },
  { value: "problema_site", label: "Problema no Site", description: "Reportar erro ou mau funcionamento" },
  { value: "duvida", label: "Dúvida", description: "Tirar dúvidas sobre o serviço" },
  { value: "suporte_tecnico", label: "Suporte Técnico", description: "Ajuda técnica geral" },
  { value: "outro", label: "Outro Assunto", description: "Assunto não listado acima" },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Aberto", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: Clock },
  in_progress: { label: "Em Andamento", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", icon: AlertCircle },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-border", icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  medium: { label: "Média", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  high: { label: "Alta", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export default function ClientProjectTickets() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<ProjectTicket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ category: "", title: "", description: "", priority: "medium" });
  const [newMessage, setNewMessage] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .eq("client_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user?.id,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["client-project-tickets", projectId],
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

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", selectedTicket?.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!selectedTicket?.id,
  });

  const { data: admins } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw error;
      return data.map((r) => r.user_id);
    },
  });

  const { data: onboarding } = useQuery({
    queryKey: ["client-onboarding-name", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("company_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["client-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticket: { title: string; description: string; priority: string }) => {
      const { data, error } = await supabase
        .from("project_tickets")
        .insert({
          project_id: projectId,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: "open",
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Notify all admins about new ticket
      const companyName = onboarding?.company_name || "Cliente";
      const clientName = profile?.full_name || companyName;
      const projectName = project?.name || "Projeto";
      try {
        await notifyAllAdminsNewTicket(
          clientName,
          companyName,
          ticket.title,
          data.id,
          projectName,
          projectId!
        );
      } catch (e) {
        console.error("Error notifying admins:", e);
      }

      // Log audit action
      try {
        await logTicketAction(
          data.id,
          ticket.title,
          'create',
          `Ticket criado por ${clientName} no projeto ${projectName}`,
          {
            newValue: {
              title: ticket.title,
              description: ticket.description,
              priority: ticket.priority,
              status: 'open',
              project_id: projectId,
            },
            metadata: {
              client_name: clientName,
              company_name: companyName,
              project_name: projectName,
            }
          }
        );
      } catch (logErr) {
        console.warn("Failed to log ticket creation:", logErr);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-project-tickets", projectId] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets-summary"] });
      setIsDialogOpen(false);
      setNewTicket({ category: "", title: "", description: "", priority: "medium" });
      toast.success("Ticket criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar ticket");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket?.id,
          user_id: user?.id,
          message,
        })
        .select()
        .single();
      if (error) throw error;

      // Notify all admins about new message
      if (selectedTicket) {
        const companyName = onboarding?.company_name || "Cliente";
        try {
          await notifyAllAdminsClientMessage(companyName, selectedTicket.title, selectedTicket.id);
        } catch (e) {
          console.error("Error notifying admins:", e);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets-summary"] });
      setNewMessage("");
      toast.success("Mensagem enviada!");
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  const handleCreateTicket = () => {
    if (!newTicket.category || !newTicket.title) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const categoryLabel = ticketCategories.find(c => c.value === newTicket.category)?.label || newTicket.category;
    createTicketMutation.mutate({
      title: `[${categoryLabel}] ${newTicket.title}`,
      description: newTicket.description,
      priority: newTicket.priority,
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const projectName = projectLoading ? "..." : project?.name || "Projeto";

  // View: Ticket Detail
  if (selectedTicket) {
    const StatusIcon = statusConfig[selectedTicket.status]?.icon || Clock;
    
    const detailBreadcrumbs = [
      { label: "Dashboard", href: "/cliente/dashboard" },
      { label: projectName, href: `/cliente/projeto/${projectId}/tickets` },
      { label: "Tickets", href: `/cliente/projeto/${projectId}/tickets` },
      { label: selectedTicket.title.substring(0, 30) + (selectedTicket.title.length > 30 ? "..." : "") },
    ];

    return (
      <ClientLayout breadcrumbs={detailBreadcrumbs}>
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setSelectedTicket(null)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar aos tickets
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{selectedTicket.title}</CardTitle>
                <CardDescription className="mt-1">Criado em {formatDate(selectedTicket.created_at)}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={priorityConfig[selectedTicket.priority]?.color}>
                  {priorityConfig[selectedTicket.priority]?.label}
                </Badge>
                <Badge variant="outline" className={statusConfig[selectedTicket.status]?.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[selectedTicket.status]?.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTicket.description && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagens
              </h3>

              <ScrollArea className="h-[300px] pr-4 mb-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.user_id === user?.id
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {msg.user_id === user?.id ? "Você" : "Suporte WebQ"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.
                  </p>
                )}
              </ScrollArea>

              {selectedTicket.status !== "closed" && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !newMessage.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  // View: Tickets List
  const listBreadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: projectName, href: `/cliente/projeto/${projectId}/tickets` },
    { label: "Tickets" },
  ];

  const headerActions = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Tipo de Solicitação *</Label>
            <Select value={newTicket.category} onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {ticketCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div>
                      <span>{cat.label}</span>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assunto *</Label>
            <Input
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              placeholder="Resuma sua solicitação"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Descreva com detalhes sua solicitação..."
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}>
              <SelectTrigger className="mt-1">
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
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateTicket} disabled={createTicketMutation.isPending}>
            {createTicketMutation.isPending ? "Criando..." : "Criar Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <ClientLayout
      breadcrumbs={listBreadcrumbs}
      title={`Tickets - ${projectName}`}
      subtitle="Acompanhe suas solicitações e converse com nossa equipe"
      headerActions={headerActions}
    >
      {/* Bloco descritivo */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Central de Solicitações
        </h3>
        <p className="text-sm text-muted-foreground">
          Utilize esta área para <strong className="text-foreground">criar solicitações</strong> como 
          alterações no site, criação de e-mails ou suporte técnico. Acompanhe o status de cada ticket 
          e <strong className="text-foreground">converse diretamente</strong> com a equipe WebQ clicando 
          no ticket desejado.
        </p>
      </div>

      {ticketsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const StatusIcon = statusConfig[ticket.status]?.icon || Clock;
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">#{ticket.id.substring(0, 8)}</span>
                        <h3 className="font-medium text-foreground truncate">{ticket.title}</h3>
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{ticket.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Criado em {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={priorityConfig[ticket.priority]?.color}>
                        {priorityConfig[ticket.priority]?.label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig[ticket.status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[ticket.status]?.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum ticket criado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Crie um ticket para solicitar alterações, tirar dúvidas ou reportar problemas.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  );
}
