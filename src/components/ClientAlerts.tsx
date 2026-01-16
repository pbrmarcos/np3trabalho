import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Bell, Palette, MessageSquare, FileDown, AlertCircle, CreditCard, Send, Clock } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientAlertsProps {
  userId: string;
  isSubscribed: boolean;
  isLoadingSubscription?: boolean;
  subscriptionEnd?: string | null;
  paymentType?: "recurring" | "one_time" | null;
  daysUntilExpiration?: number | null;
  onboarding: {
    brand_status?: string | null;
    needs_brand_creation?: boolean | null;
    brand_creation_paid?: boolean | null;
  } | null;
}

interface Alert {
  id: string;
  type: "brand" | "ticket" | "file" | "payment" | "info" | "admin_message";
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  priority: "high" | "medium" | "low";
  icon: typeof Bell;
  color: string;
}

export default function ClientAlerts({ userId, isSubscribed, isLoadingSubscription, subscriptionEnd, paymentType, daysUntilExpiration, onboarding }: ClientAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Fetch unread notifications
  const { data: notifications } = useQuery({
    queryKey: ["client-unread-notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch pending tickets (with responses)
  const { data: ticketsWithResponses } = useQuery({
    queryKey: ["client-tickets-with-responses", userId],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("client_projects")
        .select("id")
        .eq("client_id", userId);

      if (!projects?.length) return [];

      const projectIds = projects.map(p => p.id);

      const { data: tickets } = await supabase
        .from("project_tickets")
        .select(`
          id,
          title,
          project_id,
          status,
          ticket_messages(id, user_id, created_at)
        `)
        .in("project_id", projectIds)
        .in("status", ["open", "in_progress"]);

      // Filter tickets where last message is not from user
      return tickets?.filter(t => {
        const messages = t.ticket_messages || [];
        if (messages.length === 0) return false;
        const lastMessage = messages.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        return lastMessage.user_id !== userId;
      }) || [];
    },
    enabled: !!userId,
  });

  // Fetch recent files (last 24h)
  const { data: recentFiles } = useQuery({
    queryKey: ["client-recent-files", userId],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("client_projects")
        .select("id")
        .eq("client_id", userId);

      if (!projects?.length) return [];

      const projectIds = projects.map(p => p.id);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: files } = await supabase
        .from("project_files")
        .select("id, file_name, project_id, uploaded_by, created_at")
        .in("project_id", projectIds)
        .neq("uploaded_by", userId)
        .gte("created_at", oneDayAgo);

      return files || [];
    },
    enabled: !!userId,
  });

  // Fetch unread admin messages (read_at is null)
  const { data: adminMessages } = useQuery({
    queryKey: ["client-unread-admin-messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_messages")
        .select("id, message, message_type, created_at, project_id")
        .eq("client_id", userId)
        .is("read_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Build alerts array
  const alerts: Alert[] = [];

  // Payment alert - only show when loading is complete and not subscribed
  if (!isLoadingSubscription && !isSubscribed) {
    alerts.push({
      id: "payment-pending",
      type: "payment",
      title: "Pagamento pendente",
      description: "Sua assinatura não está ativa. Regularize para continuar usando os serviços.",
      href: "/cliente/assinatura",
      actionLabel: "Regularizar",
      priority: "high",
      icon: CreditCard,
      color: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
    });
  }

  // Plan expiration warning for one-time payments
  if (isSubscribed && paymentType === "one_time" && daysUntilExpiration !== null && daysUntilExpiration <= 30) {
    const expirationDate = subscriptionEnd ? format(new Date(subscriptionEnd), "dd 'de' MMMM", { locale: ptBR }) : "";
    const isUrgent = daysUntilExpiration <= 7;
    
    alerts.push({
      id: "plan-expiring",
      type: "payment",
      title: isUrgent 
        ? `⚠️ Seu plano vence em ${daysUntilExpiration} dias!` 
        : `Seu plano vence em ${daysUntilExpiration} dias`,
      description: isUrgent
        ? `Renove agora para evitar a suspensão dos serviços. Vencimento: ${expirationDate}.`
        : `Seu plano expira em ${expirationDate}. Renove para continuar usando todos os serviços.`,
      href: "/planos",
      actionLabel: "Renovar Agora",
      priority: isUrgent ? "high" : "medium",
      icon: Clock,
      color: isUrgent 
        ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400"
        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
    });
  }
  // Brand pending review
  if (onboarding?.needs_brand_creation && onboarding?.brand_status === "pending_review") {
    alerts.push({
      id: "brand-review",
      type: "brand",
      title: "Nova versão da logo disponível!",
      description: "Uma nova versão da sua identidade visual está pronta para avaliação.",
      href: "/cliente/design",
      actionLabel: "Avaliar agora",
      priority: "high",
      icon: Palette,
      color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
    });
  }

  // Tickets with responses
  if (ticketsWithResponses && ticketsWithResponses.length > 0) {
    const count = ticketsWithResponses.length;
    const firstTicket = ticketsWithResponses[0];
    alerts.push({
      id: "ticket-response",
      type: "ticket",
      title: count === 1 ? "Resposta no seu ticket" : `${count} tickets com novas respostas`,
      description: count === 1 ? firstTicket.title : "Você tem respostas aguardando sua visualização.",
      href: `/cliente/projeto/${firstTicket.project_id}/tickets`,
      actionLabel: "Ver respostas",
      priority: "medium",
      icon: MessageSquare,
      color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
    });
  }

  // Recent files
  if (recentFiles && recentFiles.length > 0) {
    const count = recentFiles.length;
    const firstFile = recentFiles[0];
    alerts.push({
      id: "new-files",
      type: "file",
      title: count === 1 ? "Novo arquivo recebido" : `${count} novos arquivos recebidos`,
      description: count === 1 ? firstFile.file_name : "Novos arquivos foram adicionados ao seu projeto.",
      href: `/cliente/projeto/${firstFile.project_id}/arquivos`,
      actionLabel: "Ver arquivos",
      priority: "low",
      icon: FileDown,
      color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    });
  }

  // Unread admin messages
  if (adminMessages && adminMessages.length > 0) {
    const count = adminMessages.length;
    const firstMessage = adminMessages[0];
    alerts.push({
      id: "admin-message",
      type: "admin_message",
      title: count === 1 ? "Nova mensagem da WebQ" : `${count} novas mensagens da WebQ`,
      description: firstMessage.message.length > 80 ? firstMessage.message.substring(0, 80) + "..." : firstMessage.message,
      href: firstMessage.project_id ? `/cliente/projeto/${firstMessage.project_id}/configuracoes` : "/cliente/timeline",
      actionLabel: "Ver mensagem",
      priority: "high",
      icon: Send,
      color: "bg-primary/10 border-primary/30 text-primary",
    });
  }

  // Filter dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert) => {
        const Icon = alert.icon;
        
        return (
          <div
            key={alert.id}
            className={`relative p-4 rounded-lg border ${alert.color} animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-50 hover:opacity-100"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-start gap-3 pr-8">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.color.replace('border-', 'bg-').replace('/30', '/20')}`}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">
                  {alert.title}
                </h4>
                <p className="text-sm opacity-80 mt-0.5">
                  {alert.description}
                </p>
                
                {alert.href && (
                  <Link to={alert.href}>
                    <Button 
                      size="sm" 
                      variant={alert.priority === "high" ? "default" : "outline"}
                      className="mt-3"
                    >
                      {alert.actionLabel}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
