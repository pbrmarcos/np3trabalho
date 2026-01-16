import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Send, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Loader2,
  User,
  Reply,
  Search,
  Filter,
  Calendar,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { notifyAdminMessage } from "@/services/notificationService";
import { logAction } from "@/services/auditService";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface AdminMessageHistoryProps {
  projectId: string;
  clientId: string;
  projectName: string;
  onSendMessage?: () => void;
}

interface TimelineMessage {
  id: string;
  message: string;
  message_type: string;
  created_at: string;
  admin_id: string | null;
  sender_type: string;
}

const messageTypeConfig = {
  info: { 
    icon: MessageSquare, 
    color: "bg-primary/10 text-primary border-primary/20",
    label: "Info"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    label: "Aviso"
  },
  success: { 
    icon: CheckCircle2, 
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Sucesso"
  },
  client: { 
    icon: User, 
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    label: "Cliente"
  },
};

export default function AdminMessageHistory({ 
  projectId, 
  clientId, 
  projectName,
  onSendMessage 
}: AdminMessageHistoryProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin-timeline-messages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TimelineMessage[];
    },
    enabled: !!projectId,
  });

  // Also fetch messages without project_id (general client messages)
  const { data: generalMessages } = useQuery({
    queryKey: ["admin-timeline-messages-general", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_messages")
        .select("*")
        .eq("client_id", clientId)
        .is("project_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TimelineMessage[];
    },
    enabled: !!clientId,
  });

  // Real-time subscription for new client messages
  useEffect(() => {
    if (!clientId) return;

    console.log("[REALTIME] Setting up admin timeline_messages subscription for client:", clientId);

    const channel = supabase
      .channel(`admin-timeline-messages-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timeline_messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = payload.new as TimelineMessage;
          
          // Only notify for client messages
          if (newMessage.sender_type === "client") {
            console.log("[REALTIME] New client message received:", payload);
            
            queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages", projectId] });
            queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages-general", clientId] });
            
            playNotificationSound("message");
            
            toast.info("Nova mensagem do cliente", {
              description: newMessage.message.length > 80 
                ? newMessage.message.substring(0, 80) + "..." 
                : newMessage.message,
              duration: 6000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] Admin subscription status:", status);
      });

    return () => {
      console.log("[REALTIME] Cleaning up admin timeline_messages subscription");
      supabase.removeChannel(channel);
    };
  }, [clientId, projectId, queryClient, playNotificationSound]);

  const allMessages = [
    ...(messages || []),
    ...(generalMessages || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply filters
  const filteredMessages = allMessages.filter((message) => {
    // Filter by type
    if (filterType === "client" && message.sender_type !== "client") return false;
    if (filterType === "admin" && message.sender_type === "client") return false;
    
    // Filter by date
    if (filterDate) {
      const messageDate = format(new Date(message.created_at), "yyyy-MM-dd");
      if (messageDate !== filterDate) return false;
    }
    
    // Filter by text search
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      if (!message.message.toLowerCase().includes(search)) return false;
    }
    
    return true;
  });

  const handleResend = async (message: TimelineMessage) => {
    setResendingId(message.id);
    try {
      await notifyAdminMessage(
        clientId,
        projectId,
        projectName,
        message.message
      );

      toast.success("Mensagem reenviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages", projectId] });
    } catch (error) {
      console.error("Error resending message:", error);
      toast.error("Erro ao reenviar mensagem");
    } finally {
      setResendingId(null);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || isSendingReply) return;
    
    setIsSendingReply(true);
    try {
      await notifyAdminMessage(
        clientId,
        projectId,
        projectName,
        replyText.trim()
      );

      toast.success("Resposta enviada!");
      setReplyText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages", projectId] });
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages-general", clientId] });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Erro ao enviar resposta");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeletingId(messageId);
    try {
      // Get message content before deleting for audit log
      const messageToDelete = allMessages.find(m => m.id === messageId);
      
      const { error } = await supabase
        .from("timeline_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      // Log to audit trail
      await logAction({
        actionType: 'delete',
        entityType: 'message',
        entityId: messageId,
        entityName: `Mensagem para ${projectName}`,
        description: `Mensagem excluída do projeto ${projectName}`,
        oldValue: messageToDelete ? {
          message: messageToDelete.message,
          message_type: messageToDelete.message_type,
          created_at: messageToDelete.created_at,
        } : undefined,
        metadata: {
          project_id: projectId,
          client_id: clientId,
          project_name: projectName,
        },
      });

      toast.success("Mensagem excluída!");
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages", projectId] });
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages-general", clientId] });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erro ao excluir mensagem");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const clientMessages = allMessages.filter(m => m.sender_type === "client");
  const hasUnreadClientMessages = clientMessages.length > 0;

  const FilterControls = () => (
    <div className="flex gap-2 items-center flex-wrap">
      <div className="relative flex-1 min-w-[150px] max-w-[250px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar mensagens..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-8 w-[140px] text-xs"
        />
        {(filterDate || searchText) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setFilterDate("");
              setSearchText("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );

  if (allMessages.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Histórico de Mensagens
          </CardTitle>
          {onSendMessage && (
            <Button size="sm" variant="outline" onClick={onSendMessage}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Enviar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda.</p>
            <p className="text-xs mt-1">
              Use o botão Enviar para iniciar a conversa.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Histórico de Mensagens
          <Badge variant="secondary">
            {allMessages.length}
          </Badge>
          {hasUnreadClientMessages && (
            <Badge variant="default" className="bg-emerald-500">
              {clientMessages.length} do cliente
            </Badge>
          )}
        </CardTitle>
        {onSendMessage && (
          <Button size="sm" variant="outline" onClick={onSendMessage}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Enviar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <FilterControls />
        
        {filteredMessages.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhuma mensagem encontrada com os filtros selecionados.
          </div>
        )}
        
        {filteredMessages.slice(0, 10).map((message) => {
          const isClientMessage = message.sender_type === "client";
          const configKey = isClientMessage ? "client" : (message.message_type as keyof typeof messageTypeConfig);
          const config = messageTypeConfig[configKey] || messageTypeConfig.info;
          const Icon = config.icon;
          const isResending = resendingId === message.id;
          const isReplying = replyingTo === message.id;

          return (
            <div key={message.id}>
              <div 
                className={`p-3 rounded-lg border ${config.color} ${isClientMessage ? 'ml-0 mr-8' : 'ml-8 mr-0'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {isClientMessage ? "Cliente" : config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(message.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {isClientMessage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setReplyingTo(isReplying ? null : message.id)}
                        title="Responder"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!isClientMessage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleResend(message)}
                          disabled={isResending}
                          title="Reenviar mensagem"
                        >
                          {isResending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={deletingId === message.id}
                              title="Excluir mensagem"
                            >
                              {deletingId === message.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A mensagem será removida permanentemente do histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(message.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply input */}
              {isReplying && (
                <div className="mt-2 ml-8 p-3 bg-muted/50 rounded-lg border">
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px] mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isSendingReply}
                    >
                      {isSendingReply ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {filteredMessages.length > 10 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{filteredMessages.length - 10} mensagens anteriores
          </p>
        )}
      </CardContent>
    </Card>
  );
}