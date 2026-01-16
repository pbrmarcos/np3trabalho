import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Loader2, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyTicketResponse, notifyTicketStatusChange } from "@/services/notificationService";

interface TicketDetailProps {
  ticket: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    created_at: string;
    created_by: string;
    project_id?: string;
  };
  userId: string;
  projectId: string;
  onBack: () => void;
  onStatusChange: (status: string) => void;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
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

export default function TicketDetail({ ticket, userId, projectId, onBack, onStatusChange }: TicketDetailProps) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticket.id,
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        user_id: userId,
        message: newMessage.trim(),
      });
      if (error) throw error;
      
      // Send notification to client
      try {
        await notifyTicketResponse(ticket.created_by, ticket.title, ticket.id, projectId, newMessage.trim());
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
      setNewMessage("");
      toast.success("Mensagem enviada!");
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  const statusInfo = statusConfig[ticket.status] || statusConfig.open;
  const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      {/* Ticket Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{ticket.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Criado em {new Date(ticket.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(ticket.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${priorityInfo.color}`}>
                {priorityInfo.label}
              </Badge>
              <Select value={ticket.status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        {ticket.description && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {messages.map((msg) => {
                const isOwn = msg.user_id === userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {isOwn ? "Admin" : "Cliente"}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          )}

          {/* New Message Input */}
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => addMessageMutation.mutate()}
              disabled={!newMessage.trim() || addMessageMutation.isPending}
              size="icon"
              className="h-auto"
            >
              {addMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
