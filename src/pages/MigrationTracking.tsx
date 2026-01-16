import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Clock, CheckCircle2, AlertCircle, Loader2, Globe, Server, Mail, FileCode, Bell, BellRing, MessageSquare, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { useNotificationSound } from "@/hooks/useNotificationSound";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending: { 
    label: "Pendente", 
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: <Clock className="h-5 w-5" />,
    description: "Sua solicitação foi recebida e está aguardando análise da nossa equipe."
  },
  in_contact: { 
    label: "Em Contato", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: <Mail className="h-5 w-5" />,
    description: "Nossa equipe entrou em contato para alinhar detalhes da migração."
  },
  analyzing: { 
    label: "Em Análise", 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: <Search className="h-5 w-5" />,
    description: "Estamos analisando seu site atual para garantir uma migração perfeita."
  },
  approved: { 
    label: "Aprovado", 
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: "Migração aprovada! Em breve iniciaremos o processo de transferência."
  },
  in_progress: { 
    label: "Em Andamento", 
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    description: "A migração do seu site está sendo realizada."
  },
  completed: { 
    label: "Concluída", 
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: "Migração concluída com sucesso! Seu site está funcionando na nossa infraestrutura."
  },
  cancelled: { 
    label: "Cancelada", 
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertCircle className="h-5 w-5" />,
    description: "A solicitação de migração foi cancelada."
  },
};

const siteTypeLabels: Record<string, string> = {
  wordpress: "WordPress",
  wix: "Wix",
  html: "HTML/CSS",
  ecommerce: "E-commerce",
  outro: "Outro"
};

// Steps by site type with specific descriptions
const stepsBySiteType: Record<string, { status: string; label: string }[]> = {
  wordpress: [
    { status: "pending", label: "Solicitação Recebida" },
    { status: "in_contact", label: "Contato Inicial" },
    { status: "analyzing", label: "Análise do WordPress" },
    { status: "approved", label: "Aprovação" },
    { status: "in_progress", label: "Migração de Arquivos e BD" },
    { status: "completed", label: "Concluída" },
  ],
  wix: [
    { status: "pending", label: "Solicitação Recebida" },
    { status: "in_contact", label: "Contato Inicial" },
    { status: "analyzing", label: "Análise do Wix" },
    { status: "approved", label: "Aprovação" },
    { status: "in_progress", label: "Recriação do Site" },
    { status: "completed", label: "Concluída" },
  ],
  html: [
    { status: "pending", label: "Solicitação Recebida" },
    { status: "in_contact", label: "Contato Inicial" },
    { status: "analyzing", label: "Análise dos Arquivos" },
    { status: "approved", label: "Aprovação" },
    { status: "in_progress", label: "Transferência de Arquivos" },
    { status: "completed", label: "Concluída" },
  ],
  ecommerce: [
    { status: "pending", label: "Solicitação Recebida" },
    { status: "in_contact", label: "Contato Inicial" },
    { status: "analyzing", label: "Análise da Loja" },
    { status: "approved", label: "Aprovação" },
    { status: "in_progress", label: "Migração de Produtos e BD" },
    { status: "completed", label: "Concluída" },
  ],
  default: [
    { status: "pending", label: "Solicitação Recebida" },
    { status: "in_contact", label: "Contato Inicial" },
    { status: "analyzing", label: "Análise Técnica" },
    { status: "approved", label: "Aprovação" },
    { status: "in_progress", label: "Migração" },
    { status: "completed", label: "Concluída" },
  ],
};

interface MigrationMessage {
  id: string;
  message: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export default function MigrationTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [migration, setMigration] = useState<any>(null);
  const [messages, setMessages] = useState<MigrationMessage[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { playNotificationSound } = useNotificationSound();

  // Check if notifications are already enabled
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notificações ativadas!", {
          description: "Você receberá alertas quando o status mudar"
        });
        // Send test notification
        new Notification("Notificações ativadas!", {
          body: "Você receberá alertas sobre sua migração",
          icon: "/favicon.ico"
        });
      } else {
        toast.error("Permissão negada para notificações");
      }
    } catch (error) {
      toast.error("Erro ao ativar notificações");
    }
  };

  // Real-time subscription for status updates
  useEffect(() => {
    if (!migration?.id) return;

    const channel = supabase
      .channel(`migration-${migration.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "migration_requests",
          filter: `id=eq.${migration.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldStatus = migration.status;
          const newStatus = newData.status;
          const oldNotes = migration.client_notes;
          const newNotes = newData.client_notes;

          if (oldStatus !== newStatus) {
            // Play notification sound
            playNotificationSound("project");
            
            // Show toast notification
            toast.success("Status atualizado!", {
              description: `Sua migração agora está: ${statusConfig[newStatus]?.label || newStatus}`,
              icon: <Bell className="h-4 w-4" />,
              duration: 8000,
            });

            // Send browser notification if enabled
            if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
              new Notification("Status da Migração Atualizado!", {
                body: `Sua migração agora está: ${statusConfig[newStatus]?.label || newStatus}`,
                icon: "/favicon.ico"
              });
            }
          }

          // Notify if client notes were updated
          if (oldNotes !== newNotes && newNotes) {
            toast.info("Nova mensagem da equipe!", {
              description: "A equipe WebQ deixou uma atualização para você",
              duration: 8000,
            });

            if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
              new Notification("Nova mensagem sobre sua migração!", {
                body: "A equipe WebQ deixou uma atualização para você",
                icon: "/favicon.ico"
              });
            }
          }

          // Update migration data
          setMigration(newData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [migration?.id, migration?.status, migration?.client_notes, notificationsEnabled, playNotificationSound]);

  // Fetch messages when migration is found
  const fetchMessages = async (migrationId: string) => {
    const { data } = await supabase
      .from("migration_messages")
      .select("id, message, created_at, attachment_url, attachment_name")
      .eq("migration_id", migrationId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setMessages(data);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!migration?.id) return;

    fetchMessages(migration.id);

    const channel = supabase
      .channel(`migration-messages-${migration.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "migration_messages",
          filter: `migration_id=eq.${migration.id}`,
        },
        (payload) => {
          const newMessage = payload.new as MigrationMessage;
          setMessages((prev) => [newMessage, ...prev]);
          
          playNotificationSound("message");
          toast.info("Nova mensagem da equipe!", {
            description: "A equipe WebQ deixou uma atualização",
            duration: 8000,
          });

          if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
            new Notification("Nova mensagem sobre sua migração!", {
              body: newMessage.message.substring(0, 100),
              icon: "/favicon.ico"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [migration?.id, notificationsEnabled, playNotificationSound]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um email ou domínio para buscar");
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setMigration(null);
    setMessages([]);

    try {
      const { data, error } = await supabase
        .from("migration_requests")
        .select("*")
        .or(`email.ilike.%${searchTerm}%,current_domain.ilike.%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setMigration(data);
        // Only fetch messages if payment is confirmed
        if (data.payment_status === 'paid') {
          fetchMessages(data.id);
        }
      }
    } catch (error) {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getStepsForSiteType = (siteType: string) => {
    return stepsBySiteType[siteType] || stepsBySiteType.default;
  };

  const getCurrentStepIndex = (status: string, steps: { status: string; label: string }[]) => {
    if (status === "cancelled") return -1;
    return steps.findIndex(s => s.status === status);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
                Acompanhe sua{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Migração
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Digite seu email ou domínio para verificar o status da sua solicitação de migração.
              </p>

              {/* Search Form */}
              <Card className="max-w-xl mx-auto">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Email ou domínio (ex: meusite.com.br)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Buscar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            {notFound && (
              <Card className="max-w-2xl mx-auto border-destructive/20">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Solicitação não encontrada</h3>
                  <p className="text-muted-foreground mb-6">
                    Não encontramos nenhuma solicitação de migração com esse email ou domínio.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/migracao">Solicitar Migração</a>
                  </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Message History from Admin */}
                  {messages.length > 0 && (
                    <Card className="border-accent/30 bg-accent/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-accent" />
                          Atualizações da Equipe
                          <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {messages.map((msg, index) => {
                          const isImage = msg.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          
                          return (
                            <div 
                              key={msg.id} 
                              className={`relative pl-4 ${index < messages.length - 1 ? 'pb-4 border-b border-border/50' : ''}`}
                            >
                              <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-accent"></div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {new Date(msg.created_at).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              
                              {/* Attachment */}
                              {msg.attachment_url && msg.attachment_name && (
                                <div className="mt-2">
                                  {isImage ? (
                                    <a 
                                      href={msg.attachment_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img 
                                        src={msg.attachment_url} 
                                        alt={msg.attachment_name}
                                        className="max-w-[300px] max-h-[200px] rounded-lg border object-cover hover:opacity-90 transition-opacity"
                                      />
                                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground">
                                        <Download className="h-3 w-3" />
                                        {msg.attachment_name}
                                      </span>
                                    </a>
                                  ) : (
                                    <a 
                                      href={msg.attachment_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors"
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span className="truncate max-w-[200px]">{msg.attachment_name}</span>
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* Notification Toggle Card */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BellRing className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Notificações do navegador</p>
                            <p className="text-xs text-muted-foreground">
                              Receba alertas mesmo com a aba em segundo plano
                            </p>
                          </div>
                        </div>
                        {notificationsEnabled ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativadas
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
                            <Bell className="h-4 w-4 mr-1" />
                            Ativar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

            {migration && (() => {
              const steps = getStepsForSiteType(migration.site_type);
              const currentStepIndex = getCurrentStepIndex(migration.status, steps);
              const isPaid = migration.payment_status === 'paid';

              return (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Payment Pending Warning */}
                  {!isPaid && (
                    <Card className="border-orange-500/30 bg-orange-500/5">
                      <CardContent className="py-6 text-center">
                        <AlertCircle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold mb-2">Aguardando Pagamento</h3>
                        <p className="text-sm text-muted-foreground">
                          Sua solicitação foi recebida, mas a migração só será iniciada após a confirmação do pagamento.
                          Se você já realizou o pagamento, aguarde alguns minutos para a confirmação automática.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {/* Status Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            {migration.current_domain}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            Solicitado em {new Date(migration.created_at).toLocaleDateString("pt-BR")}
                            <Badge variant="outline" className="ml-2">
                              <FileCode className="h-3 w-3 mr-1" />
                              {siteTypeLabels[migration.site_type] || migration.site_type}
                            </Badge>
                          </CardDescription>
                        </div>
                        <Badge className={statusConfig[migration.status]?.color || statusConfig.pending.color}>
                          {statusConfig[migration.status]?.icon}
                          <span className="ml-2">{statusConfig[migration.status]?.label || "Pendente"}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {statusConfig[migration.status]?.description || statusConfig.pending.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Progress Timeline */}
                  {migration.status !== "cancelled" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Progresso da Migração</CardTitle>
                        <CardDescription>
                          Etapas específicas para migração de {siteTypeLabels[migration.site_type] || "site"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <div className="flex justify-between">
                            {steps.map((step, index) => {
                              const isCompleted = index <= currentStepIndex;
                              const isCurrent = index === currentStepIndex;

                              return (
                                <div key={step.status} className="flex flex-col items-center flex-1">
                                  <div
                                    className={`
                                      w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-background
                                      ${isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}
                                      ${isCurrent ? "ring-4 ring-primary/20" : ""}
                                    `}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-5 w-5" />
                                    ) : (
                                      <span className="text-sm text-muted-foreground">{index + 1}</span>
                                    )}
                                  </div>
                                  <span className={`mt-2 text-xs text-center max-w-[80px] ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0" />
                          <div 
                            className="absolute top-5 left-0 h-0.5 bg-primary -z-0 transition-all duration-500"
                            style={{ width: `${Math.max(0, currentStepIndex / (steps.length - 1)) * 100}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Details Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalhes da Solicitação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{migration.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Hospedagem Atual</p>
                            <p className="font-medium">{migration.current_host || "Não informado"}</p>
                          </div>
                        </div>
                      </div>
                      {migration.additional_info && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-1">Informações Adicionais</p>
                          <p className="text-sm">{migration.additional_info}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Help Card */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">Precisa de ajuda?</h4>
                          <p className="text-sm text-muted-foreground">
                            Entre em contato com nossa equipe para dúvidas sobre sua migração.
                          </p>
                        </div>
                        <Button variant="outline" asChild>
                          <a href="mailto:suporte@webq.com.br">Contato</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
