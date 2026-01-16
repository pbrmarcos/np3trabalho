import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Filter,
  Package,
  ChevronUp,
  ArrowRight,
  User,
  AlertTriangle,
} from "lucide-react";
import { QUERY_STALE_TIME, QUERY_LIMITS } from "@/lib/queryConfig";
import { perfMonitor } from "@/lib/performanceMonitor";

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

interface ClientTimelineProps {
  userId: string;
}

const eventConfig: Record<string, { icon: typeof Clock; color: string; category: string; accent?: string }> = {
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
  admin_message_info: { icon: MessageSquare, color: "text-primary bg-primary/10", category: "mensagens", accent: "from-primary/40 via-primary/10 to-transparent" },
  admin_message_warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10", category: "mensagens", accent: "from-amber-500/40 via-amber-500/10 to-transparent" },
  admin_message_success: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10", category: "mensagens", accent: "from-emerald-500/40 via-emerald-500/10 to-transparent" },
  client_message: { icon: User, color: "text-emerald-600 bg-emerald-500/10", category: "mensagens", accent: "from-emerald-500/40 via-emerald-500/10 to-transparent" },
  design_order_created: { icon: Package, color: "text-blue-500 bg-blue-500/10", category: "design" },
  design_order_delivered: { icon: Package, color: "text-purple-500 bg-purple-500/10", category: "design" },
  design_order_approved: { icon: CheckCircle2, color: "text-green-500 bg-green-500/10", category: "design" },
  design_order_revision: { icon: Package, color: "text-amber-500 bg-amber-500/10", category: "design" },
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

const INITIAL_ITEMS = 5;
const ITEMS_PER_PAGE = 10;
const MAX_DASHBOARD_ITEMS = 40;

const normalizeAdminMessageType = (type?: string | null) => {
  const t = (type || "info").toLowerCase().trim();

  if (["success", "sucesso", "ok", "positivo"].includes(t)) return "success";
  if (["warning", "warn", "aviso", "atencao", "atenção"].includes(t)) return "warning";

  return "info";
};

export default function ClientTimeline({ userId }: ClientTimelineProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [displayCount, setDisplayCount] = useState(INITIAL_ITEMS);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["client-timeline", userId],
    queryFn: async () => {
      return perfMonitor.measureAsync("ClientTimeline:events", async () => {
        const allEvents: TimelineEvent[] = [];

      // Batch fetch all data in parallel to avoid N+1 queries
      const [
        onboardingResult,
        projectsResult,
        brandOrderResult,
        timelineMessagesResult,
        adminNotificationsResult,
        designOrdersResult,
      ] = await Promise.all([
        // Fetch onboarding data
        supabase
          .from("client_onboarding")
          .select("created_at, selected_plan, needs_brand_creation")
          .eq("user_id", userId)
          .maybeSingle(),
        // Fetch projects
        supabase
          .from("client_projects")
          .select("id, name, domain, status, created_at, updated_at")
          .eq("client_id", userId),
        // Fetch brand design order
        supabase
          .from("design_orders")
          .select("id")
          .eq("client_id", userId)
          .eq("package_id", "pkg-brand-creation")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Fetch timeline messages
        supabase
          .from("timeline_messages")
          .select("id, message, message_type, created_at, sender_type")
          .eq("client_id", userId)
          .order("created_at", { ascending: false })
          .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
        // Fetch admin notifications
        supabase
          .from("notifications")
          .select("id, message, created_at")
          .eq("user_id", userId)
          .eq("type", "admin_message")
          .order("created_at", { ascending: false })
          .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
        // Fetch design orders
        supabase
          .from("design_orders")
          .select("id, status, created_at, package:design_packages(name)")
          .eq("client_id", userId)
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false })
          .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
      ]);

      const onboarding = onboardingResult.data;
      const projects = projectsResult.data || [];
      const brandOrder = brandOrderResult.data;
      const timelineMessages = timelineMessagesResult.data || [];
      const adminNotifications = adminNotificationsResult.data || [];
      const designOrders = designOrdersResult.data || [];

      // Process onboarding events
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

      // Get project IDs for batch fetching related data
      const projectIds = projects.map(p => p.id);

      // Batch fetch all project-related data in parallel (fixes N+1)
      let credentials: any[] = [];
      let files: any[] = [];
      let tickets: any[] = [];

      if (projectIds.length > 0) {
        const [credentialsResult, filesResult, ticketsResult] = await Promise.all([
          supabase
            .from("project_credentials")
            .select("id, label, created_at, credential_type, project_id")
            .in("project_id", projectIds)
            .eq("credential_type", "email")
            .order("created_at", { ascending: false })
            .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
          supabase
            .from("project_files")
            .select("id, file_name, created_at, uploaded_by, project_id")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
            .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
          supabase
            .from("project_tickets")
            .select("id, title, created_at, resolved_at, status, project_id")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
            .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY),
        ]);

        credentials = credentialsResult.data || [];
        files = filesResult.data || [];
        tickets = ticketsResult.data || [];
      }

      // Process project events
      for (const project of projects) {
        allEvents.push({
          id: `project-created-${project.id}`,
          type: "project_created",
          category: "geral",
          date: project.created_at,
          title: "Projeto criado",
          description: project.name,
          link: `/cliente/projeto/${project.id}/configuracoes`,
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
            link: `https://${project.domain}`,
            ...eventConfig.site_published,
          });
        }
      }

      // Process credentials (emails) - already fetched in batch
      for (const cred of credentials) {
        allEvents.push({
          id: `email-${cred.id}`,
          type: "email_created",
          category: "emails",
          date: cred.created_at,
          title: "E-mail criado",
          description: cred.label,
          link: `/cliente/projeto/${cred.project_id}/emails`,
          ...eventConfig.email_created,
        });
      }

      // Process files - already fetched in batch
      for (const file of files) {
        const isUploaded = file.uploaded_by === userId;
        allEvents.push({
          id: `file-${file.id}`,
          type: isUploaded ? "file_uploaded" : "file_received",
          category: "arquivos",
          date: file.created_at,
          title: isUploaded ? "Arquivo enviado" : "Arquivo recebido",
          description: file.file_name,
          link: `/cliente/projeto/${file.project_id}/arquivos`,
          ...(isUploaded ? eventConfig.file_uploaded : eventConfig.file_received),
        });
      }

      // Process tickets - already fetched in batch
      for (const ticket of tickets) {
        allEvents.push({
          id: `ticket-created-${ticket.id}`,
          type: "ticket_created",
          category: "tickets",
          date: ticket.created_at,
          title: "Ticket criado",
          description: ticket.title,
          link: `/cliente/projeto/${ticket.project_id}/tickets?ticket=${ticket.id}`,
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
            link: `/cliente/projeto/${ticket.project_id}/tickets?ticket=${ticket.id}`,
            ...eventConfig.ticket_resolved,
          });
        }
      }

      // Process brand order deliveries and feedback
      if (brandOrder) {
        const [brandDeliveriesResult, brandFeedbackResult] = await Promise.all([
          supabase
            .from("design_deliveries")
            .select("id, version_number, created_at, status")
            .eq("order_id", brandOrder.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("design_feedback")
            .select("id, feedback_type, created_at, delivery_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const brandDeliveries = brandDeliveriesResult.data || [];
        const brandFeedback = brandFeedbackResult.data || [];

        for (const delivery of brandDeliveries) {
          allEvents.push({
            id: `brand-delivery-${delivery.id}`,
            type: "brand_delivered",
            category: "marca",
            date: delivery.created_at,
            title: "Logo entregue",
            description: `Versão ${delivery.version_number}`,
            link: "/cliente/design",
            ...eventConfig.brand_delivered,
          });
        }

        // Filter feedback that belongs to brand deliveries
        const brandDeliveryIds = brandDeliveries.map(d => d.id);
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
            link: "/cliente/design",
            ...(isApproved ? eventConfig.brand_approved : eventConfig.brand_revision),
          });
        }
      }

      // Process timeline messages
      for (const msg of timelineMessages) {
        const isClientMessage = msg.sender_type === "client";
        const normalizedType = normalizeAdminMessageType(msg.message_type);

        const eventType = isClientMessage
          ? "client_message"
          : `admin_message_${normalizedType}`;

        const config = eventConfig[eventType] || eventConfig.admin_message_info;

        allEvents.push({
          id: `msg-${msg.id}`,
          type: eventType,
          category: "mensagens",
          date: msg.created_at,
          title: isClientMessage ? "Sua mensagem" : "Mensagem da WebQ",
          description: msg.message,
          ...config,
        });
      }

      // Process admin notifications (fallback) - skip if message already exists
      for (const notif of adminNotifications) {
        // Check if a similar message already exists (within 5 seconds and same content)
        const exists = allEvents.some(
          (e) => e.type.startsWith("admin_message") && 
                 e.description === notif.message &&
                 Math.abs(new Date(e.date).getTime() - new Date(notif.created_at).getTime()) < 5000,
        );
        if (exists) continue;

        allEvents.push({
          id: `notif-msg-${notif.id}`,
          type: "admin_message_info",
          category: "mensagens",
          date: notif.created_at,
          title: "Mensagem da WebQ",
          description: notif.message || "",
          ...eventConfig.admin_message_info,
        });
      }

      // Process design orders
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

      // Fetch design deliveries for user's orders
      const designOrderIds = designOrders.map((o: any) => o.id);
      if (designOrderIds.length > 0) {
        const { data: designDeliveries } = await supabase
          .from("design_deliveries")
          .select("id, version_number, status, created_at, order_id, order:design_orders(client_id, package:design_packages(name))")
          .in("order_id", designOrderIds)
          .order("created_at", { ascending: false })
          .limit(QUERY_LIMITS.TIMELINE_PER_CATEGORY);

        if (designDeliveries) {
          for (const delivery of designDeliveries as any[]) {
            if (delivery.order?.client_id !== userId) continue;
            
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
      }

      // Sort by date descending and limit total events
      return allEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, QUERY_LIMITS.TIMELINE_EVENTS);
      });
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME.DYNAMIC,
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
    setDisplayCount(INITIAL_ITEMS);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    setDisplayCount(INITIAL_ITEMS);
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  // Filter events
  const filteredEvents = selectedFilters.length === 0
    ? events 
    : events?.filter(e => selectedFilters.includes(e.category));

  // Limit to MAX_DASHBOARD_ITEMS for dashboard view
  const limitedEvents = filteredEvents?.slice(0, MAX_DASHBOARD_ITEMS);
  const displayEvents = limitedEvents?.slice(0, displayCount);
  const hasMore = (limitedEvents?.length || 0) > displayCount && displayCount < MAX_DASHBOARD_ITEMS;
  const remainingCount = Math.min((limitedEvents?.length || 0) - displayCount, ITEMS_PER_PAGE);
  const hasMoreThanMax = (filteredEvents?.length || 0) > MAX_DASHBOARD_ITEMS;

  // Count events by category for badges
  const countByCategory = events?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalEvents = events?.length || 0;
  const activeFiltersCount = selectedFilters.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Linha do Tempo</CardTitle>
              <p className="text-xs text-muted-foreground">
                {filteredEvents?.length || 0} de {totalEvents} eventos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View full timeline link */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/cliente/timeline")}
            >
              Ver tudo
              <ArrowRight className="h-3 w-3" />
            </Button>
            
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
        {displayEvents && displayEvents.length > 0 ? (
          <div className="relative pt-1 pb-2">
            {/* Vertical line (starts slightly below first icon and ends above last) */}
            <div className="absolute left-[15px] top-4 bottom-6 w-px bg-border/70" />

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

              {/* Start marker - show when all events are displayed */}
              {!hasMore && selectedFilters.length === 0 && (
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

            {/* Load more button */}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 gap-2"
                onClick={loadMore}
              >
                <ChevronDown className="h-4 w-4" />
                Carregar mais {remainingCount} eventos
              </Button>
            )}

            {/* View full timeline button */}
            {hasMoreThanMax && displayCount >= MAX_DASHBOARD_ITEMS && (
              <Button
                variant="default"
                size="sm"
                className="w-full mt-4 gap-2"
                onClick={() => navigate("/cliente/timeline")}
              >
                Ver linha do tempo completa
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {/* Progress indicator */}
            {displayEvents && displayEvents.length > 0 && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Mostrando {displayEvents.length} de {filteredEvents?.length || 0} eventos
                {hasMoreThanMax && ` (máx. ${MAX_DASHBOARD_ITEMS} no dashboard)`}
              </p>
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
      </CardContent>
    </Card>
  );
}
