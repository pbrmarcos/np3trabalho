import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  RefreshCw, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Server,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Upload,
  X,
  Loader2,
  BarChart3,
  Trash2,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMigrationNotifications } from "@/hooks/useMigrationNotifications";
import { logAction } from "@/services/auditService";
import MigrationReportSection from "@/components/admin/MigrationReportSection";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type MigrationStatus = "pending" | "in_contact" | "analyzing" | "approved" | "in_progress" | "completed" | "cancelled";

const statusDescriptions: Record<MigrationStatus, string> = {
  pending: "Recebemos sua solicitação e em breve nossa equipe entrará em contato para entender melhor suas necessidades.",
  in_contact: "Nossa equipe está em contato com você para alinhar os detalhes da migração.",
  analyzing: "Estamos analisando seu site atual para garantir uma migração perfeita.",
  approved: "Sua migração foi aprovada! Em breve iniciaremos o processo de transferência.",
  in_progress: "A migração está em andamento. Seu site está sendo transferido para nossa infraestrutura.",
  completed: "A migração foi concluída com sucesso! Seu site já está funcionando em nossa infraestrutura premium.",
  cancelled: "A solicitação de migração foi cancelada. Se tiver dúvidas, entre em contato conosco."
};


interface MigrationRequest {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  current_domain: string;
  current_host: string | null;
  site_type: string;
  additional_info: string | null;
  status: MigrationStatus;
  notes: string | null;
  client_notes: string | null;
  payment_status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
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
  html: "HTML/CSS",
  ecommerce: "E-commerce",
  outro: "Outro"
};

export default function AdminMigrations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [editingClientNotes, setEditingClientNotes] = useState<{ id: string; notes: string; file: File | null } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Enable real-time notifications
  useMigrationNotifications();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["migration-requests", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("migration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,current_domain.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MigrationRequest[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, request, previousStatus }: { id: string; status: MigrationStatus; request: MigrationRequest; previousStatus: MigrationStatus }) => {
      // Update status in database
      const { error } = await supabase
        .from("migration_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      // Send email notification to client
      const statusLabel = statusConfig[status].label;
      const statusDescription = statusDescriptions[status];

      await supabase.functions.invoke("send-email", {
        body: {
          template_slug: "migration_status_update",
          recipients: [request.email],
          variables: {
            client_name: request.name,
            current_domain: request.current_domain,
            status_label: statusLabel,
            status_description: statusDescription
          }
        }
      });

      // Log audit action
      try {
        await logAction({
          actionType: 'status_change',
          entityType: 'project',
          entityId: id,
          entityName: request.current_domain,
          description: `Status de migração alterado: ${statusConfig[previousStatus].label} → ${statusLabel}`,
          oldValue: { status: previousStatus },
          newValue: { status },
          metadata: { 
            client_name: request.name, 
            client_email: request.email,
            migration_type: 'site_migration'
          }
        });
      } catch (logErr) {
        console.warn("Failed to log migration status change:", logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
      toast.success("Status atualizado e cliente notificado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("migration_requests")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
      setEditingNotes(null);
      toast.success("Notas salvas");
    },
    onError: () => {
      toast.error("Erro ao salvar notas");
    }
  });

  const addMessageMutation = useMutation({
    mutationFn: async ({ migrationId, message, file, request }: { migrationId: string; message: string; file: File | null; request: MigrationRequest }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      // Upload file if present
      if (file) {
        setIsUploading(true);
        const fileExt = file.name.split(".").pop();
        const fileName = `${migrationId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { signedUrl } } = await supabase.storage
          .from("project-files")
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
        
        attachmentUrl = signedUrl || null;
        attachmentName = file.name;
        setIsUploading(false);
      }

      // Insert message into history
      const { error } = await supabase
        .from("migration_messages")
        .insert({
          migration_id: migrationId,
          message,
          admin_id: user.id,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        });
      if (error) throw error;

      // Send email notification
      const statusLabel = statusConfig[request.status].label;
      await supabase.functions.invoke("send-email", {
        body: {
          template_slug: "migration_message",
          recipients: [request.email],
          variables: {
            client_name: request.name,
            current_domain: request.current_domain,
            message,
            status_label: statusLabel,
            tracking_url: "https://webq.com.br/migracao/acompanhar",
            has_attachment: !!attachmentUrl,
            attachment_name: attachmentName
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
      queryClient.invalidateQueries({ queryKey: ["migration-messages"] });
      setEditingClientNotes(null);
      toast.success("Mensagem enviada e cliente notificado por email");
    },
    onError: (error) => {
      console.error("Error adding message:", error);
      setIsUploading(false);
      toast.error("Erro ao enviar mensagem");
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, request }: { id: string; request: MigrationRequest }) => {
      // First delete associated messages
      await supabase
        .from("migration_messages")
        .delete()
        .eq("migration_id", id);

      // Then delete the request
      const { error } = await supabase
        .from("migration_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Log audit action
      try {
        await logAction({
          actionType: 'delete',
          entityType: 'project',
          entityId: id,
          entityName: request.current_domain,
          description: `Solicitação de migração excluída: ${request.current_domain}`,
          metadata: { 
            client_name: request.name, 
            client_email: request.email,
            migration_type: 'site_migration'
          }
        });
      } catch (logErr) {
        console.warn("Failed to log migration deletion:", logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
      toast.success("Solicitação excluída com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir solicitação");
    }
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, payment_status, request }: { id: string; payment_status: string; request: MigrationRequest }) => {
      const { error } = await supabase
        .from("migration_requests")
        .update({ payment_status })
        .eq("id", id);
      if (error) throw error;

      // Log audit action
      try {
        await logAction({
          actionType: 'update',
          entityType: 'project',
          entityId: id,
          entityName: request.current_domain,
          description: `Status de pagamento alterado: ${payment_status === 'paid' ? 'Pago' : payment_status === 'cancelled' ? 'Cancelado' : 'Pendente'}`,
          oldValue: { payment_status: request.payment_status },
          newValue: { payment_status },
          metadata: { 
            client_name: request.name, 
            client_email: request.email
          }
        });
      } catch (logErr) {
        console.warn("Failed to log payment status change:", logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
      toast.success("Status de pagamento atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status de pagamento");
    }
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    inProgress: requests.filter(r => ["in_contact", "analyzing", "approved", "in_progress"].includes(r.status)).length,
    completed: requests.filter(r => r.status === "completed").length,
    paid: requests.filter(r => r.payment_status === "paid").length
  };

  return (
    <AdminLayoutWithSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Solicitações de Migração</h1>
          <p className="text-muted-foreground">Gerencie as solicitações de migração de sites</p>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">
              <RefreshCw className="h-4 w-4 mr-2" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatório
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6 mt-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">Em Andamento</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Concluídos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <div className="text-sm text-muted-foreground">Pagos</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou domínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusConfig).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhuma solicitação encontrada
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => {
              const statusInfo = statusConfig[request.status];
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedId === request.id;

              return (
                <Collapsible key={request.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : request.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                {request.current_domain}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {request.name} • {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.payment_status === 'paid' ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Pago
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Aguardando Pgto
                              </Badge>
                            )}
                            <Badge variant="outline" className={statusInfo.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Contact Info */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contato</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${request.email}`} className="text-primary hover:underline">
                                  {request.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`https://wa.me/${request.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {request.whatsapp}
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Site Info */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Site</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a href={`https://${request.current_domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                  {request.current_domain}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              {request.current_host && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Server className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.current_host}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary">{siteTypeLabels[request.site_type] || request.site_type}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        {request.additional_info && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Informações Adicionais</h4>
                            <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.additional_info}</p>
                          </div>
                        )}

                        {/* Internal Notes */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Notas Internas
                          </h4>
                          {editingNotes?.id === request.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNotes.notes}
                                onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                                placeholder="Adicione notas sobre esta solicitação..."
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => updateNotesMutation.mutate({ id: request.id, notes: editingNotes.notes })}>
                                  Salvar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="text-sm bg-muted/50 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors min-h-[60px]"
                              onClick={() => setEditingNotes({ id: request.id, notes: request.notes || "" })}
                            >
                              {request.notes || <span className="text-muted-foreground italic">Clique para adicionar notas...</span>}
                            </div>
                          )}
                        </div>

                        {/* Client Visible Messages */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-accent uppercase tracking-wide flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Enviar Mensagem para o Cliente
                            <Badge variant="outline" className="text-xs ml-2">Visível + Email</Badge>
                          </h4>
                          {editingClientNotes?.id === request.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editingClientNotes.notes}
                                onChange={(e) => setEditingClientNotes({ ...editingClientNotes, notes: e.target.value })}
                                placeholder="Escreva uma mensagem de progresso para o cliente..."
                                rows={3}
                              />
                              
                              {/* File attachment */}
                              <div className="flex items-center gap-2">
                                {editingClientNotes.file ? (
                                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-sm">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate max-w-[200px]">{editingClientNotes.file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={() => setEditingClientNotes({ ...editingClientNotes, file: null })}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setEditingClientNotes({ ...editingClientNotes, file });
                                        }
                                      }}
                                    />
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                      <Upload className="h-4 w-4" />
                                      <span>Anexar arquivo</span>
                                    </div>
                                  </label>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => addMessageMutation.mutate({ 
                                    migrationId: request.id, 
                                    message: editingClientNotes.notes,
                                    file: editingClientNotes.file,
                                    request 
                                  })}
                                  disabled={addMessageMutation.isPending || isUploading}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      Enviando...
                                    </>
                                  ) : addMessageMutation.isPending ? (
                                    "Enviando..."
                                  ) : (
                                    "Enviar Mensagem"
                                  )}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingClientNotes(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingClientNotes({ id: request.id, notes: "", file: null })}
                              className="w-full justify-start text-muted-foreground"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Adicionar nova mensagem...
                            </Button>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Select 
                            value={request.status} 
                            onValueChange={(value) => updateStatusMutation.mutate({ id: request.id, status: value as MigrationStatus, request, previousStatus: request.status })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Payment status selector */}
                          <Select 
                            value={request.payment_status} 
                            onValueChange={(value) => updatePaymentStatusMutation.mutate({ id: request.id, payment_status: value, request })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Aguardando</SelectItem>
                              <SelectItem value="paid">Pago</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${request.email}`}>
                              <Mail className="h-4 w-4 mr-1" />
                              Email
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`https://wa.me/${request.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                              <Phone className="h-4 w-4 mr-1" />
                              WhatsApp
                            </a>
                          </Button>

                          {/* Delete button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A solicitação de migração de <strong>{request.current_domain}</strong> será permanentemente excluída, incluindo todas as mensagens associadas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({ id: request.id, request })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            <MigrationReportSection />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayoutWithSidebar>
  );
}