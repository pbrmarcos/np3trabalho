import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyClientTimelineMessage } from "@/services/notificationService";
import { 
  Clock, 
  CreditCard, 
  FolderPlus, 
  Globe, 
  Mail, 
  FileUp, 
  FileDown, 
  MessageSquare, 
  CheckCircle2, 
  Palette, 
  ThumbsUp,
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  ChevronUp,
  Send,
  User,
  AlertTriangle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: string;
  category: string;
  date: string;
  title: string;
  description: string;
  icon: typeof Clock;
  color: string;
  link?: string;
}

const eventConfig: Record<string, { icon: typeof Clock; color: string; category: string }> = {
  subscription: { icon: CreditCard, color: "text-green-500 bg-green-500/10", category: "geral" },
  project_created: { icon: FolderPlus, color: "text-blue-500 bg-blue-500/10", category: "geral" },
  site_published: { icon: Globe, color: "text-emerald-500 bg-emerald-500/10", category: "geral" },
  email_created: { icon: Mail, color: "text-indigo-500 bg-indigo-500/10", category: "emails" },
  file_uploaded: { icon: FileUp, color: "text-orange-500 bg-orange-500/10", category: "arquivos" },
  file_received: { icon: FileDown, color: "text-cyan-500 bg-cyan-500/10", category: "arquivos" },
  ticket_created: { icon: MessageSquare, color: "text-yellow-500 bg-yellow-500/10", category: "tickets" },
  ticket_resolved: { icon: CheckCircle2, color: "text-green-500 bg-green-500/10", category: "tickets" },
  brand_delivered: { icon: Palette, color: "text-purple-500 bg-purple-500/10", category: "marca" },
  brand_approved: { icon: ThumbsUp, color: "text-green-500 bg-green-500/10", category: "marca" },
  brand_revision: { icon: Palette, color: "text-amber-500 bg-amber-500/10", category: "marca" },
  admin_message_info: { icon: MessageSquare, color: "text-primary bg-primary/10", category: "mensagens" },
  admin_message_warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10", category: "mensagens" },
  admin_message_success: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10", category: "mensagens" },
  client_message: { icon: User, color: "text-emerald-600 bg-emerald-500/10", category: "mensagens" },
  design_order_created: { icon: Package, color: "text-blue-500 bg-blue-500/10", category: "design" },
  design_order_delivered: { icon: Package, color: "text-purple-500 bg-purple-500/10", category: "design" },
  design_order_approved: { icon: CheckCircle2, color: "text-green-500 bg-green-500/10", category: "design" },
  design_order_revision: { icon: Package, color: "text-amber-500 bg-amber-500/10", category: "design" },
};

const normalizeAdminMessageType = (type?: string | null) => {
  const t = (type || "info").toLowerCase().trim();

  if (["success", "sucesso", "ok", "positivo"].includes(t)) return "success";
  if (["warning", "warn", "aviso", "atencao", "atenção"].includes(t)) return "warning";

  return "info";
};

const filterOptions = [
  { key: "mensagens", label: "Mensagens", icon: MessageSquare },
  { key: "tickets", label: "Tickets", icon: MessageSquare },
  { key: "arquivos", label: "Arquivos", icon: FileDown },
  { key: "marca", label: "Marca", icon: Palette },
  { key: "design", label: "Design", icon: Package },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "geral", label: "Geral", icon: FolderPlus },
];

const ITEMS_PER_PAGE = 40;

export default function ClientTimelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Enable realtime notifications for admin messages
  useRealtimeMessages({ userId: user?.id, enabled: !!user?.id });

  // Auto-mark messages as read when page loads
  const markMessagesAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("timeline_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("client_id", user.id)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-messages-data"] });
      queryClient.invalidateQueries({ queryKey: ["client-unread-admin-messages"] });
    },
  });

  // Mark all messages as read when component mounts
  useEffect(() => {
    if (user?.id) {
      markMessagesAsRead.mutate();
    }
  }, [user?.id]);

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Linha do Tempo" },
  ];

  const { data: events, isLoading } = useQuery({
    queryKey: ["client-timeline-full", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allEvents: TimelineEvent[] = [];

      // Fetch onboarding data
      const { data: onboarding } = await supabase
        .from("client_onboarding")
        .select("created_at, selected_plan, needs_brand_creation")
        .eq("user_id", user.id)
        .maybeSingle();

      if (onboarding) {
        allEvents.push({
          id: `onboarding-${onboarding.created_at}`,
          type: "subscription",
          category: "geral",
          date: onboarding.created_at,
          title: "Assinou o plano",
          description: onboarding.selected_plan,
          ...eventConfig.subscription,
        });

        if (onboarding.needs_brand_creation) {
          allEvents.push({
            id: `brand-contracted-${onboarding.created_at}`,
            type: "subscription",
            category: "marca",
            date: onboarding.created_at,
            title: "Contratou",
            description: "Criação de Marca",
            ...eventConfig.brand_delivered,
          });
        }
      }

      // Fetch projects
      const { data: projects } = await supabase
        .from("client_projects")
        .select("id, name, domain, status, created_at, updated_at")
        .eq("client_id", user.id);

      if (projects) {
        for (const project of projects) {
          allEvents.push({
            id: `project-created-${project.id}`,
            type: "project_created",
            category: "geral",
            date: project.created_at,
            title: "Projeto criado",
            description: project.name,
            ...eventConfig.project_created,
          });

          if (project.status === "online" && project.domain) {
            allEvents.push({
              id: `site-published-${project.id}`,
              type: "site_published",
              category: "geral",
              date: project.updated_at,
              title: "Site publicado",
              description: project.domain,
              ...eventConfig.site_published,
            });
          }

          // Fetch credentials (emails)
          const { data: credentials } = await supabase
            .from("project_credentials")
            .select("id, label, created_at, credential_type")
            .eq("project_id", project.id)
            .eq("credential_type", "email");

          if (credentials) {
            for (const cred of credentials) {
              allEvents.push({
                id: `email-${cred.id}`,
                type: "email_created",
                category: "emails",
                date: cred.created_at,
                title: "E-mail criado",
                description: cred.label,
                ...eventConfig.email_created,
              });
            }
          }

          // Fetch files
          const { data: files } = await supabase
            .from("project_files")
            .select("id, file_name, created_at, uploaded_by")
            .eq("project_id", project.id);

          if (files) {
            for (const file of files) {
              const isUploaded = file.uploaded_by === user.id;
              allEvents.push({
                id: `file-${file.id}`,
                type: isUploaded ? "file_uploaded" : "file_received",
                category: "arquivos",
                date: file.created_at,
                title: isUploaded ? "Arquivo enviado" : "Arquivo recebido",
                description: file.file_name,
                ...(isUploaded ? eventConfig.file_uploaded : eventConfig.file_received),
              });
            }
          }

          // Fetch tickets
          const { data: tickets } = await supabase
            .from("project_tickets")
            .select("id, title, created_at, resolved_at, status")
            .eq("project_id", project.id);

          if (tickets) {
            for (const ticket of tickets) {
              allEvents.push({
                id: `ticket-created-${ticket.id}`,
                type: "ticket_created",
                category: "tickets",
                date: ticket.created_at,
                title: "Ticket criado",
                description: ticket.title,
                ...eventConfig.ticket_created,
              });

              if (ticket.resolved_at) {
                allEvents.push({
                  id: `ticket-resolved-${ticket.id}`,
                  type: "ticket_resolved",
                  category: "tickets",
                  date: ticket.resolved_at,
                  title: "Ticket resolvido",
                  description: ticket.title,
                  ...eventConfig.ticket_resolved,
                });
              }
            }
          }
        }
      }

      // Fetch brand design order and its deliveries/feedback
      const { data: brandOrder } = await supabase
        .from("design_orders")
        .select("id")
        .eq("client_id", user.id)
        .eq("package_id", "pkg-brand-creation")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (brandOrder) {
        // Fetch brand deliveries from design_deliveries
        const { data: brandDeliveries } = await supabase
          .from("design_deliveries")
          .select("id, version_number, created_at, status")
          .eq("order_id", brandOrder.id);

        if (brandDeliveries) {
          for (const delivery of brandDeliveries) {
            allEvents.push({
              id: `brand-delivery-${delivery.id}`,
              type: "brand_delivered",
              category: "marca",
              date: delivery.created_at,
              title: "Logo entregue",
              description: `Versão ${delivery.version_number}`,
              ...eventConfig.brand_delivered,
            });
          }
        }

        // Fetch brand feedback from design_feedback
        const { data: brandFeedback } = await supabase
          .from("design_feedback")
          .select("id, feedback_type, created_at, delivery_id")
          .eq("user_id", user.id);

        if (brandFeedback) {
          // Filter feedback that belongs to brand deliveries
          const brandDeliveryIds = brandDeliveries?.map(d => d.id) || [];
          const relevantFeedback = brandFeedback.filter(fb => brandDeliveryIds.includes(fb.delivery_id));
          
          for (const feedback of relevantFeedback) {
            const isApproved = feedback.feedback_type === "approve";
            allEvents.push({
              id: `brand-feedback-${feedback.id}`,
              type: isApproved ? "brand_approved" : "brand_revision",
              category: "marca",
              date: feedback.created_at,
              title: isApproved ? "Logo aprovado" : "Revisão solicitada",
              description: isApproved ? "Identidade visual finalizada!" : "Ajustes solicitados na logo",
              ...(isApproved ? eventConfig.brand_approved : eventConfig.brand_revision),
            });
          }
        }
      }

      // Fetch messages from timeline_messages (both admin and client)
      const { data: timelineMessages } = await supabase
        .from("timeline_messages")
        .select("id, message, message_type, created_at, sender_type")
        .eq("client_id", user.id);

      if (timelineMessages) {
        for (const msg of timelineMessages) {
          const isClientMessage = (msg as any).sender_type === 'client';
          const normalizedType = normalizeAdminMessageType((msg as any).message_type);
          const eventType = isClientMessage 
            ? 'client_message' 
            : `admin_message_${normalizedType}`;
          allEvents.push({
            id: `msg-${msg.id}`,
            type: eventType,
            category: "mensagens",
            date: msg.created_at,
            title: isClientMessage ? "Sua mensagem" : "Mensagem da WebQ",
            description: msg.message,
            ...eventConfig[eventType] || eventConfig.admin_message_info,
          });
        }
      }

      // Fetch design orders
      const { data: designOrders } = await supabase
        .from("design_orders")
        .select("id, status, created_at, package:design_packages(name)")
        .eq("client_id", user.id)
        .eq("payment_status", "paid");

      if (designOrders) {
        for (const order of designOrders as any[]) {
          const packageName = order.package?.name || 'Design';
          allEvents.push({
            id: `design-order-${order.id}`,
            type: "design_order_created",
            category: "design",
            date: order.created_at,
            title: "Pedido de design",
            description: packageName,
            link: `/cliente/design/${order.id}`,
            ...eventConfig.design_order_created,
          });
        }
      }

      // Fetch design deliveries
      const { data: designDeliveries } = await supabase
        .from("design_deliveries")
        .select("id, version_number, status, created_at, order_id, order:design_orders(client_id, package:design_packages(name))")
        .order("created_at", { ascending: false });

      if (designDeliveries) {
        for (const delivery of designDeliveries as any[]) {
          if (delivery.order?.client_id !== user.id) continue;
          
          const packageName = delivery.order?.package?.name || 'Design';
          allEvents.push({
            id: `design-delivery-${delivery.id}`,
            type: "design_order_delivered",
            category: "design",
            date: delivery.created_at,
            title: `Entrega v${delivery.version_number}`,
            description: packageName,
            link: `/cliente/design/${delivery.order_id}`,
            ...eventConfig.design_order_delivered,
          });
        }
      }

      return allEvents.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!user?.id,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const toggleFilter = (key: string) => {
    setSelectedFilters(prev => 
      prev.includes(key) 
        ? prev.filter(f => f !== key)
        : [...prev, key]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    setCurrentPage(1);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || isSending || !user?.id) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from("timeline_messages")
        .insert({
          client_id: user.id,
          message: replyMessage.trim(),
          message_type: "info",
          sender_type: "client",
          admin_id: null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Notify admins about the client message
      if (data?.id) {
        notifyClientTimelineMessage(user.id, replyMessage.trim(), data.id).catch(console.error);
      }

      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["client-timeline-full"] });
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  // Filter events
  const filteredEvents = selectedFilters.length === 0
    ? events 
    : events?.filter(e => selectedFilters.includes(e.category));

  const totalPages = Math.ceil((filteredEvents?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayEvents = filteredEvents?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Count events by category
  const countByCategory = events?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalEvents = events?.length || 0;
  const activeFiltersCount = selectedFilters.length;

  return (
    <ClientLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Linha do Tempo Completa</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {filteredEvents?.length || 0} de {totalEvents} eventos
                  </p>
                </div>
              </div>
              
              {/* Filter Dropdown */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-9"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                    {isFilterOpen ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-popover" align="end">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-sm font-medium">Categorias</span>
                      {activeFiltersCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={clearFilters}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <div className="border-t border-border my-1" />
                    {filterOptions.map((filter) => {
                      const Icon = filter.icon;
                      const count = countByCategory[filter.key] || 0;
                      const isChecked = selectedFilters.includes(filter.key);
                      
                      return (
                        <div
                          key={filter.key}
                          className="flex items-center gap-3 px-2 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                          onClick={() => toggleFilter(filter.key)}
                        >
                          <Checkbox 
                            checked={isChecked}
                            onCheckedChange={() => toggleFilter(filter.key)}
                            className="pointer-events-none"
                          />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm">{filter.label}</span>
                          <Badge variant="outline" className="h-5 px-1.5 text-xs">
                            {count}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active filters pills */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedFilters.map(filterKey => {
                  const filter = filterOptions.find(f => f.key === filterKey);
                  if (!filter) return null;
                  const Icon = filter.icon;
                  return (
                    <Badge 
                      key={filterKey}
                      variant="secondary" 
                      className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => toggleFilter(filterKey)}
                    >
                      <Icon className="h-3 w-3" />
                      {filter.label}
                      <span className="ml-1 hover:text-destructive">×</span>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : displayEvents && displayEvents.length > 0 ? (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                  {displayEvents.map((event, index) => {
                    const Icon = event.icon;
                    const isLast = index === displayEvents.length - 1;
                    
                    return (
                      <div 
                        key={event.id} 
                        className={`relative flex gap-4 ${event.link ? "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg transition-colors" : ""}`}
                        onClick={() => event.link && navigate(event.link)}
                      >
                        {/* Icon */}
                        <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${event.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-4 ${!isLast ? "border-b border-border/50" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-medium text-foreground ${event.link ? "hover:text-primary" : ""}`}>
                                {event.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                            <time 
                              className="text-xs text-muted-foreground whitespace-nowrap"
                              title={formatFullDate(event.date)}
                            >
                              {formatDate(event.date)}
                            </time>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* End marker on last page */}
                  {currentPage === totalPages && selectedFilters.length === 0 && (
                    <div className="relative flex gap-4">
                      <div className="relative z-10 h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      </div>
                      <div className="flex-1 flex items-center">
                        <p className="text-xs text-muted-foreground">
                          Início da jornada
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedFilters.length === 0 
                    ? "Sua jornada está começando!" 
                    : `Nenhum evento nas categorias selecionadas`}
                </p>
                {selectedFilters.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}

            {/* Reply input */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Responder para a WebQ..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
