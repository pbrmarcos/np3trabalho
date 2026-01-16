import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { perfMonitor } from "@/lib/performanceMonitor";

export interface SLAConfig {
  design_new: {
    enabled: boolean;
    usePackageEstimate: boolean;
    defaultDays: number;
  };
  design_revision: {
    enabled: boolean;
    percentOfOriginal: number;
    minHours: number;
  };
  ticket: {
    enabled: boolean;
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  migration: {
    enabled: boolean;
    defaultDays: number;
  };
  notifications: {
    enabled: boolean;
    warningPercent: number;
    soundEnabled: boolean;
    toastEnabled: boolean;
  };
}

const defaultSLAConfig: SLAConfig = {
  design_new: { enabled: true, usePackageEstimate: true, defaultDays: 5 },
  design_revision: { enabled: true, percentOfOriginal: 50, minHours: 24 },
  ticket: { enabled: true, urgent: 6, high: 12, medium: 24, low: 48 },
  migration: { enabled: true, defaultDays: 3 },
  notifications: { enabled: true, warningPercent: 25, soundEnabled: true, toastEnabled: true },
};

export interface Demand {
  id: string;
  type: 'design_revision' | 'design_new' | 'ticket' | 'migration';
  title: string;
  clientName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deadline: Date;
  estimatedDays: number;
  priority?: string;
  projectId?: string;
  packageName?: string;
  revisionsUsed?: number;
  maxRevisions?: number;
  migrationDomain?: string;
  migrationSiteType?: string;
}

export interface DemandsData {
  demands: Demand[];
  overdue: number;
  urgent: number;
  normal: number;
  isLoading: boolean;
  slaConfig: SLAConfig;
}

export function useAdminDemands(): DemandsData {
  // Fetch SLA config
  const { data: slaConfigData } = useQuery({
    queryKey: ["admin-sla-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sla_config")
        .single();
      
      if (error || !data || !data.value || typeof data.value !== 'object') {
        return defaultSLAConfig;
      }
      return { ...defaultSLAConfig, ...(data.value as Record<string, unknown>) } as SLAConfig;
    },
    staleTime: 60000,
  });

  const slaConfig = slaConfigData || defaultSLAConfig;

  const { data: designDemands, isLoading: loadingDesign } = useQuery({
    queryKey: ["admin-demands-design"],
    queryFn: async () => {
      return perfMonitor.measureAsync("AdminDemands:designOrders", async () => {
        // Fetch design orders that need admin action
        const { data: orders, error } = await supabase
          .from("design_orders")
          .select(`
            id,
            client_id,
            status,
            revisions_used,
            max_revisions,
            created_at,
            updated_at,
            package:design_packages(name, estimated_days)
          `)
          .in("status", ["revision_requested", "paid", "confirmed", "in_production"])
          .order("updated_at", { ascending: true });
        
        if (error) throw error;
        if (!orders || orders.length === 0) return { orders: [], profiles: {} };

        // Fetch profiles separately
        const clientIds = [...new Set(orders.map(o => o.client_id).filter(Boolean))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name")
          .in("user_id", clientIds);

        const profileMap = profiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        return { orders, profiles: profileMap };
      });
    },
  });

  const { data: ticketDemands, isLoading: loadingTickets } = useQuery({
    queryKey: ["admin-demands-tickets"],
    queryFn: async () => {
      return perfMonitor.measureAsync("AdminDemands:tickets", async () => {
        const { data: tickets, error } = await supabase
          .from("project_tickets")
          .select(`
            id,
            title,
            status,
            priority,
            created_at,
            updated_at,
            project:client_projects(
              id,
              name,
              client_id
            )
          `)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: true });
        
        if (error) throw error;

        // Get client profiles for tickets
        const clientIds = [...new Set(tickets?.map(t => (t.project as any)?.client_id).filter(Boolean))];
        
        if (clientIds.length === 0) return { tickets: tickets || [], profiles: {} };

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name")
          .in("user_id", clientIds);

        const profileMap = profiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        return { tickets: tickets || [], profiles: profileMap };
      });
    },
  });

  // Fetch pending migrations
  const { data: migrationDemands, isLoading: loadingMigrations } = useQuery({
    queryKey: ["admin-demands-migrations"],
    queryFn: async () => {
      return perfMonitor.measureAsync("AdminDemands:migrations", async () => {
        const { data: migrations, error } = await supabase
          .from("migration_requests")
          .select("*")
          .in("status", ["pending", "in_progress", "analyzing"])
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        return migrations || [];
      });
    },
  });

  const demands: Demand[] = [];

  // Process design orders
  if (designDemands?.orders) {
    designDemands.orders.forEach((order: any) => {
      const pkg = order.package as any;
      const profile = designDemands.profiles[order.client_id];
      const packageEstimatedDays = pkg?.estimated_days || 5;
      
      // Use SLA config for estimated days
      const estimatedDays = slaConfig.design_new.usePackageEstimate 
        ? packageEstimatedDays 
        : slaConfig.design_new.defaultDays;
      
      const createdAt = new Date(order.created_at);
      const updatedAt = new Date(order.updated_at);
      
      let deadline: Date;
      let type: 'design_revision' | 'design_new';
      let finalEstimatedDays: number;
      
      if (order.status === 'revision_requested') {
        // Revisions use SLA config percentage
        type = 'design_revision';
        const revisionDays = (estimatedDays * slaConfig.design_revision.percentOfOriginal) / 100;
        const minDays = slaConfig.design_revision.minHours / 24;
        finalEstimatedDays = Math.max(revisionDays, minDays);
        deadline = new Date(updatedAt.getTime() + (finalEstimatedDays * 24 * 60 * 60 * 1000));
      } else {
        // New orders get full estimated time
        type = 'design_new';
        finalEstimatedDays = estimatedDays;
        deadline = new Date(createdAt.getTime() + (estimatedDays * 24 * 60 * 60 * 1000));
      }

      demands.push({
        id: order.id,
        type,
        title: pkg?.name || 'Pedido de Design',
        clientName: profile?.company_name || profile?.full_name || 'Cliente',
        status: order.status,
        createdAt,
        updatedAt,
        deadline,
        estimatedDays: finalEstimatedDays,
        packageName: pkg?.name,
        revisionsUsed: order.revisions_used || 0,
        maxRevisions: order.max_revisions || 2,
      });
    });
  }

  // Process tickets
  if (ticketDemands?.tickets) {
    ticketDemands.tickets.forEach((ticket: any) => {
      const project = ticket.project as any;
      const profile = ticketDemands.profiles[project?.client_id];
      const createdAt = new Date(ticket.created_at);
      const updatedAt = new Date(ticket.updated_at);
      
      // Use SLA config for ticket priority times
      const ticketSLA = slaConfig.ticket;
      const slaHours = ticket.priority === 'urgent' ? ticketSLA.urgent : 
                       ticket.priority === 'high' ? ticketSLA.high :
                       ticket.priority === 'low' ? ticketSLA.low : ticketSLA.medium;
      const slaDays = slaHours / 24;
      const deadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));

      demands.push({
        id: ticket.id,
        type: 'ticket',
        title: ticket.title,
        clientName: profile?.company_name || profile?.full_name || project?.name || 'Cliente',
        status: ticket.status,
        createdAt,
        updatedAt,
        deadline,
        estimatedDays: slaDays,
        priority: ticket.priority,
        projectId: project?.id,
      });
    });
  }

  // Process migrations
  if (migrationDemands) {
    const migrationSLADays = slaConfig.migration?.defaultDays || 3;
    migrationDemands.forEach((migration: any) => {
      const createdAt = new Date(migration.created_at);
      const updatedAt = new Date(migration.updated_at);
      const deadline = new Date(createdAt.getTime() + (migrationSLADays * 24 * 60 * 60 * 1000));

      const siteTypeLabels: Record<string, string> = {
        wordpress: "WordPress",
        html: "HTML/CSS",
        wix: "Wix",
        squarespace: "Squarespace",
        ecommerce: "E-commerce",
        outro: "Outro",
      };

      demands.push({
        id: migration.id,
        type: 'migration',
        title: `Migração: ${migration.current_domain}`,
        clientName: migration.name,
        status: migration.status,
        createdAt,
        updatedAt,
        deadline,
        estimatedDays: migrationSLADays,
        migrationDomain: migration.current_domain,
        migrationSiteType: siteTypeLabels[migration.site_type] || migration.site_type,
      });
    });
  }

  // Sort by urgency: overdue first, then by time remaining
  const now = new Date();
  demands.sort((a, b) => {
    const aRemaining = a.deadline.getTime() - now.getTime();
    const bRemaining = b.deadline.getTime() - now.getTime();
    
    // Overdue items first
    if (aRemaining < 0 && bRemaining >= 0) return -1;
    if (bRemaining < 0 && aRemaining >= 0) return 1;
    
    // Then by least time remaining
    return aRemaining - bRemaining;
  });

  // Calculate counts
  const overdue = demands.filter(d => d.deadline.getTime() < now.getTime()).length;
  const urgent = demands.filter(d => {
    const remaining = d.deadline.getTime() - now.getTime();
    const totalTime = d.estimatedDays * 24 * 60 * 60 * 1000;
    return remaining >= 0 && remaining < totalTime * 0.25; // Less than 25% time remaining
  }).length;
  const normal = demands.length - overdue - urgent;

  return {
    demands,
    overdue,
    urgent,
    normal,
    isLoading: loadingDesign || loadingTickets || loadingMigrations,
    slaConfig,
  };
}
