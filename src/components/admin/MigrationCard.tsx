import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Archive, ExternalLink, Clock, CheckCircle2, AlertCircle, Phone, RefreshCw, Search, XCircle, MessageSquare, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface MigrationCardProps {
  onboarding: {
    migration_current_domain?: string | null;
    migration_current_host?: string | null;
    migration_site_type?: string | null;
    migration_has_access?: boolean | null;
    migration_assistance_level?: string | null;
    migration_access_notes?: string | null;
  };
  clientEmail?: string | null;
}

type MigrationStatus = "pending" | "in_contact" | "analyzing" | "approved" | "in_progress" | "completed" | "cancelled";

interface MigrationMessage {
  id: string;
  message: string;
  created_at: string;
  sender_type: string;
  admin_id?: string | null;
  client_id?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

const statusConfig: Record<MigrationStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: Clock },
  in_contact: { label: "Em Contato", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Phone },
  analyzing: { label: "Analisando", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: Search },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: CheckCircle2 },
  in_progress: { label: "Em Migração", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: RefreshCw },
  completed: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle }
};

const siteTypeLabels: Record<string, string> = {
  wordpress: "WordPress",
  html: "HTML/CSS Estático",
  ecommerce: "E-commerce / Loja Virtual",
  outro: "Outro"
};

export default function MigrationCard({ onboarding, clientEmail }: MigrationCardProps) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch migration request to get additional_info
  const { data: migrationRequest } = useQuery({
    queryKey: ["migration-request-by-domain", onboarding.migration_current_domain, clientEmail],
    queryFn: async () => {
      let query = supabase.from("migration_requests").select("*");
      
      if (onboarding.migration_current_domain) {
        query = query.eq("current_domain", onboarding.migration_current_domain);
      }
      
      if (clientEmail) {
        query = query.or(`email.eq.${clientEmail}`);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) {
        console.error("Error fetching migration request:", error);
        return null;
      }
      return data;
    },
    enabled: !!(onboarding.migration_current_domain || clientEmail),
  });

  // Fetch messages for this migration
  const { data: messages = [] } = useQuery({
    queryKey: ["migration-messages", migrationRequest?.id],
    queryFn: async () => {
      if (!migrationRequest?.id) return [];
      const { data, error } = await supabase
        .from("migration_messages")
        .select("*")
        .eq("migration_id", migrationRequest.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as MigrationMessage[];
    },
    enabled: !!migrationRequest?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!migrationRequest?.id || !newMessage.trim()) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("migration_messages")
        .insert({
          migration_id: migrationRequest.id,
          message: newMessage.trim(),
          admin_id: user.id,
          sender_type: "admin"
        });
      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke("send-email", {
        body: {
          template_slug: "migration_message",
          recipients: [migrationRequest.email],
          variables: {
            client_name: migrationRequest.name,
            current_domain: migrationRequest.current_domain,
            message: newMessage.trim(),
            status_label: statusConfig[migrationRequest.status as MigrationStatus]?.label || migrationRequest.status,
            tracking_url: `https://webq.com.br/cliente/migracao`
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-messages", migrationRequest?.id] });
      setNewMessage("");
      toast.success("Mensagem enviada ao cliente");
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
    onSettled: () => {
      setIsSending(false);
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    sendMessageMutation.mutate();
  };

  const status = migrationRequest?.status as MigrationStatus | undefined;
  const statusInfo = status ? statusConfig[status] : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-500" />
            Migração de Site
          </CardTitle>
          {statusInfo && StatusIcon && (
            <Badge variant="outline" className={statusInfo.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {onboarding.migration_current_domain && (
            <div>
              <Label className="text-xs text-muted-foreground">Domínio atual</Label>
              <p className="text-sm font-medium">{onboarding.migration_current_domain}</p>
            </div>
          )}
          {onboarding.migration_current_host && (
            <div>
              <Label className="text-xs text-muted-foreground">Hospedagem atual</Label>
              <p className="text-sm font-medium capitalize">
                {onboarding.migration_current_host === "wordpress_com" ? "WordPress.com" :
                 onboarding.migration_current_host === "uol_host" ? "UOL Host" :
                 onboarding.migration_current_host.charAt(0).toUpperCase() + onboarding.migration_current_host.slice(1)}
              </p>
            </div>
          )}
          {onboarding.migration_site_type && (
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de site</Label>
              <p className="text-sm font-medium">
                {siteTypeLabels[onboarding.migration_site_type] || onboarding.migration_site_type}
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Tem acesso ao painel</Label>
            <p className="text-sm font-medium">{onboarding.migration_has_access ? "Sim" : "Não"}</p>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Nível de assistência</Label>
          <Badge 
            variant={onboarding.migration_assistance_level === "full" ? "default" : "secondary"}
            className={onboarding.migration_assistance_level === "full" ? "bg-primary mt-1" : "mt-1"}
          >
            {onboarding.migration_assistance_level === "full" ? "Assistência Completa" : "Cliente fornece credenciais"}
          </Badge>
        </div>

        {onboarding.migration_access_notes && (
          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">Notas de acesso</Label>
            <p className="text-sm mt-1 p-2 bg-muted/50 rounded-md border border-border whitespace-pre-wrap">
              {onboarding.migration_access_notes}
            </p>
          </div>
        )}

        {/* Additional Info from migration_requests */}
        {migrationRequest?.additional_info && (
          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">Informações Adicionais (do formulário público)</Label>
            <p className="text-sm mt-1 p-2 bg-amber-500/10 rounded-md border border-amber-500/20 whitespace-pre-wrap">
              {migrationRequest.additional_info}
            </p>
          </div>
        )}

        {/* Internal notes */}
        {migrationRequest?.notes && (
          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">Notas internas da equipe</Label>
            <p className="text-sm mt-1 p-2 bg-muted/50 rounded-md border border-border whitespace-pre-wrap">
              {migrationRequest.notes}
            </p>
          </div>
        )}

        {/* Message Timeline */}
        {migrationRequest && (
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Histórico de Mensagens
              </Label>
              {messages.length > 0 && (
                <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
              )}
            </div>

            {/* Send Message */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Enviar mensagem ao cliente..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button 
                size="sm" 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages List */}
            {messages.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-2 rounded-md text-sm ${
                      msg.sender_type === "client" 
                        ? "bg-primary/10 border-l-2 border-primary" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium">
                        {msg.sender_type === "client" ? "Cliente" : "Equipe WebQ"}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhuma mensagem ainda
              </p>
            )}
          </div>
        )}

        {/* Request date and link to migrations page */}
        {migrationRequest && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">Solicitação recebida</Label>
              <p className="text-sm font-medium">
                {format(new Date(migrationRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/migrations?search=${encodeURIComponent(migrationRequest.current_domain)}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Migração
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
