import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ClientLayout from "@/components/ClientLayout";
import { Clock, CheckCircle2, AlertCircle, Loader2, Globe, Mail, Search, MessageSquare, Paperclip, Download, RefreshCw, ArrowLeft, Send, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";

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
  sender_type: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export default function ClientMigrationTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playNotificationSound } = useNotificationSound();
  const [migration, setMigration] = useState<any>(null);
  const [onboardingMigration, setOnboardingMigration] = useState<any>(null);
  const [messages, setMessages] = useState<MigrationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch migration data for current user
  useEffect(() => {
    if (!user?.email) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      // First check migration_requests by email
      const { data: migrationData } = await supabase
        .from("migration_requests")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (migrationData) {
        setMigration(migrationData);
        // Fetch messages only if payment is confirmed
        if (migrationData.payment_status === 'paid') {
          const { data: messagesData } = await supabase
            .from("migration_messages")
            .select("id, message, created_at, sender_type, attachment_url, attachment_name")
            .eq("migration_id", migrationData.id)
            .order("created_at", { ascending: false });
          setMessages(messagesData || []);
        }
      } else {
        // Check onboarding for migration request
        const { data: onboardingData } = await supabase
          .from("client_onboarding")
          .select("*")
          .eq("user_id", user.id)
          .eq("needs_migration", true)
          .single();
        
        if (onboardingData) {
          setOnboardingMigration(onboardingData);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !migration?.id || !user) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase
        .from("migration_messages")
        .insert({
          migration_id: migration.id,
          message: newMessage.trim(),
          sender_type: "client",
          client_id: user.id
        });
      
      if (error) throw error;
      
      setNewMessage("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  // Real-time subscription for updates
  useEffect(() => {
    if (!migration?.id) return;

    const channel = supabase
      .channel(`client-migration-${migration.id}`)
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
          if (migration.status !== newData.status) {
            playNotificationSound("project");
            toast.success("Status atualizado!", {
              description: `Sua migração agora está: ${statusConfig[newData.status]?.label || newData.status}`,
            });
          }
          setMigration(newData);
        }
      )
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
          toast.info("Nova mensagem da equipe!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [migration?.id, playNotificationSound]);

  const getStepsForSiteType = (siteType: string) => {
    return stepsBySiteType[siteType] || stepsBySiteType.default;
  };

  const getCurrentStepIndex = (status: string, steps: { status: string; label: string }[]) => {
    if (status === "cancelled") return -1;
    return steps.findIndex(s => s.status === status);
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente" },
    { label: "Migração" }
  ];

  if (isLoading) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs} title="Acompanhar Migração">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </ClientLayout>
    );
  }

  // No migration found
  if (!migration && !onboardingMigration) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs} title="Acompanhar Migração">
        <Card className="border-muted">
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma migração encontrada</h3>
            <p className="text-muted-foreground mb-6">
              Você ainda não tem uma solicitação de migração em andamento.
            </p>
            <Button onClick={() => navigate("/cliente")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  // Show onboarding migration (pending processing)
  if (!migration && onboardingMigration) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs} title="Acompanhar Migração">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-teal-500" />
                  Migração Solicitada
                </CardTitle>
                <CardDescription>
                  {onboardingMigration.migration_current_domain}
                </CardDescription>
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                <Clock className="h-4 w-4 mr-1" />
                Aguardando Processamento
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Sua solicitação de migração foi registrada durante o cadastro. Nossa equipe irá analisar e entrar em contato em breve.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Domínio Atual</p>
                <p className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {onboardingMigration.migration_current_domain || "Não informado"}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Hospedagem Atual</p>
                <p className="font-medium">
                  {onboardingMigration.migration_current_host || "Não informada"}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Site</p>
                <p className="font-medium">
                  {siteTypeLabels[onboardingMigration.migration_site_type] || onboardingMigration.migration_site_type || "Não informado"}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Nível de Assistência</p>
                <p className="font-medium">
                  {onboardingMigration.migration_assistance_level === "full" ? "Assistência Completa" : "Fornecerá Credenciais"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  // Show pending payment screen
  if (migration && migration.payment_status !== 'paid') {
    return (
      <ClientLayout breadcrumbs={breadcrumbs} title="Acompanhar Migração">
        <Card className="border-orange-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-teal-500" />
                  Migração: {migration.current_domain}
                </CardTitle>
                <CardDescription>
                  {siteTypeLabels[migration.site_type] || migration.site_type}
                </CardDescription>
              </div>
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                <Clock className="h-4 w-4 mr-1" />
                Aguardando Pagamento
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pagamento Pendente</h3>
              <p className="text-muted-foreground mb-4">
                Sua solicitação de migração foi recebida, mas o pagamento ainda não foi confirmado. 
                A migração só será iniciada após a confirmação do pagamento.
              </p>
              <p className="text-sm text-muted-foreground">
                Se você já realizou o pagamento, por favor aguarde alguns minutos para a confirmação automática.
                Em caso de dúvidas, entre em contato conosco.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Domínio</p>
                <p className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {migration.current_domain}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Status da Solicitação</p>
                <p className="font-medium">
                  {statusConfig[migration.status]?.label || migration.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  // Full migration tracking with steps and messages (payment confirmed)
  const currentStatus = statusConfig[migration.status] || statusConfig.pending;
  const steps = getStepsForSiteType(migration.site_type);
  const currentStepIndex = getCurrentStepIndex(migration.status, steps);

  return (
    <ClientLayout breadcrumbs={breadcrumbs} title="Acompanhar Migração">
      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-teal-500" />
                  Migração: {migration.current_domain}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {siteTypeLabels[migration.site_type] || migration.site_type}
                </CardDescription>
              </div>
              <Badge className={`${currentStatus.color} text-base px-4 py-2`}>
                {currentStatus.icon}
                <span className="ml-2">{currentStatus.label}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">{currentStatus.description}</p>

            {/* Progress Steps */}
            {migration.status !== "cancelled" && (
              <div className="relative">
                <div className="flex justify-between">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    
                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10
                          ${isCompleted ? 'bg-emerald-500 text-white' : 
                            isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                            'bg-muted text-muted-foreground'}
                        `}>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <span className={`
                          text-xs mt-2 text-center hidden sm:block
                          ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}
                        `}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages Section */}
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Comunicação com a Equipe
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reply Box */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Escreva sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages List */}
            {messages.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages.map((msg, index) => {
                  const isImage = msg.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isClientMessage = msg.sender_type === "client";
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`relative pl-4 ${index < messages.length - 1 ? 'pb-4 border-b border-border/50' : ''} ${
                        isClientMessage ? 'bg-primary/5 -mx-4 px-4 py-2 rounded-lg' : ''
                      }`}
                    >
                      <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${
                        isClientMessage ? 'bg-primary' : 'bg-accent'
                      }`}></div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">
                          {isClientMessage ? "Você" : "Equipe WebQ"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      
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
                              {msg.attachment_name}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma mensagem ainda. Envie uma mensagem para a equipe!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhes da Migração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Domínio</p>
                <p className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {migration.current_domain}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Hospedagem Atual</p>
                <p className="font-medium">{migration.current_host || "Não informada"}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Site</p>
                <p className="font-medium">{siteTypeLabels[migration.site_type] || migration.site_type}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Solicitado em</p>
                <p className="font-medium">
                  {new Date(migration.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
