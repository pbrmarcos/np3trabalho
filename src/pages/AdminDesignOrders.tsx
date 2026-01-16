import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Search, Package, Clock, CheckCircle2, AlertCircle, Loader2, User, Palette, Filter, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAdminDemands, SLAConfig } from "@/hooks/useAdminDemands";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import ErrorState from "@/components/ErrorState";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "Em Produção", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: <Loader2 className="h-3 w-3" /> },
  delivered: { label: "Entregue", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: <Package className="h-3 w-3" /> },
  revision_requested: { label: "Revisão", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { label: "✅ Concluído", color: "bg-green-600/20 text-green-700 border-green-600/40", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertCircle className="h-3 w-3" /> },
};

interface DesignOrder {
  id: string;
  client_id: string;
  status: string;
  payment_status: string;
  revisions_used: number;
  max_revisions: number;
  created_at: string;
  updated_at: string;
  notes: string | null;
  preferred_color: string | null;
  logo_description: string | null;
  inspiration_urls: string[] | null;
  category?: { id: string; name: string } | null;
  package?: { name: string; price: number; category_id: string; estimated_days?: number } | null;
  profile?: { full_name: string; company_name: string } | null;
}

interface DesignCategory {
  id: string;
  name: string;
}

// Calculate urgency based on SLA
const getOrderUrgency = (order: DesignOrder, slaConfig: SLAConfig): { level: 'overdue' | 'urgent' | 'normal'; deadline: Date; timeRemaining: string } | null => {
  if (['approved', 'cancelled', 'delivered'].includes(order.status)) return null;
  if ((order.revisions_used || 0) >= (order.max_revisions || 2)) return null;

  const now = new Date();
  const createdAt = new Date(order.created_at);
  const updatedAt = new Date(order.updated_at);
  const packageEstimatedDays = order.package?.estimated_days || 5;
  
  const estimatedDays = slaConfig.design_new.usePackageEstimate 
    ? packageEstimatedDays 
    : slaConfig.design_new.defaultDays;

  let deadline: Date;
  let totalTime: number;
  
  if (order.status === 'revision_requested') {
    const revisionDays = (estimatedDays * slaConfig.design_revision.percentOfOriginal) / 100;
    const minDays = slaConfig.design_revision.minHours / 24;
    const finalDays = Math.max(revisionDays, minDays);
    deadline = new Date(updatedAt.getTime() + (finalDays * 24 * 60 * 60 * 1000));
    totalTime = finalDays * 24 * 60 * 60 * 1000;
  } else {
    deadline = new Date(createdAt.getTime() + (estimatedDays * 24 * 60 * 60 * 1000));
    totalTime = estimatedDays * 24 * 60 * 60 * 1000;
  }

  const remaining = deadline.getTime() - now.getTime();
  const timeRemaining = remaining > 0 
    ? formatDistanceToNow(deadline, { locale: ptBR, addSuffix: false })
    : formatDistanceToNow(deadline, { locale: ptBR, addSuffix: true });

  if (remaining < 0) {
    return { level: 'overdue', deadline, timeRemaining };
  }
  
  if (remaining < totalTime * 0.25) {
    return { level: 'urgent', deadline, timeRemaining };
  }

  return { level: 'normal', deadline, timeRemaining };
};

export default function AdminDesignOrders() {
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const { slaConfig } = useAdminDemands();

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  const { data: categories } = useQuery({
    queryKey: ['design-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_service_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as DesignCategory[];
    },
    staleTime: 300000, // Cache for 5 minutes
  });

  // OPTIMIZED: Server-side search + batch fetch profiles/categories
  const { data: orders, isLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-design-orders', debouncedSearch, filter, categoryFilter],
    queryFn: async () => {
      // Build query with server-side filters
      let query = supabase
        .from('design_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Server-side status filter
      if (filter !== "all") {
        if (filter === "revision") {
          query = query.eq("status", "revision_requested");
        } else if (filter === "completed" || filter === "approved") {
          query = query.in("status", ["approved", "delivered"]);
        } else {
          query = query.eq("status", filter);
        }
      }
      
      const { data: ordersData, error } = await query;
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) return [];

      // Batch fetch packages (no FK relationship)
      const packageIds = [...new Set(ordersData.map(o => o.package_id).filter(Boolean))] as string[];
      const { data: packagesData } = await supabase
        .from('design_packages')
        .select('id, name, price, category_id, estimated_days')
        .in('id', packageIds);
      const packagesMap = new Map(packagesData?.map(p => [p.id, p]) || []);

      // Batch fetch profiles and categories
      const clientIds = [...new Set(ordersData.map(o => o.client_id))];
      const categoryIds = [...new Set(packagesData?.map(p => p.category_id).filter(Boolean))] as string[];

      const profilesPromise = supabase.from('profiles').select('user_id, full_name, company_name').in('user_id', clientIds);
      const onboardingsPromise = supabase.from('client_onboarding').select('user_id, company_name').in('user_id', clientIds);
      const categoriesPromise = categoryIds.length > 0 
        ? supabase.from('design_service_categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] });

      const [profilesRes, onboardingsRes, categoriesRes] = await Promise.all([
        profilesPromise,
        onboardingsPromise,
        categoriesPromise
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const onboardingsMap = new Map(onboardingsRes.data?.map(o => [o.user_id, o]) || []);
      const categoriesMap = new Map(categoriesRes.data?.map(c => [c.id, c]) || []);

      let filteredOrders = ordersData;
      
      // Client-side category filter (since no FK)
      if (categoryFilter !== "all") {
        filteredOrders = ordersData.filter(order => {
          const pkg = packagesMap.get(order.package_id);
          return pkg?.category_id === categoryFilter;
        });
      }

      return filteredOrders.map((order: any) => {
        const profile = profilesMap.get(order.client_id);
        const onboarding = onboardingsMap.get(order.client_id);
        const clientName = profile?.company_name || profile?.full_name || onboarding?.company_name || 'Cliente';
        
        const pkg = packagesMap.get(order.package_id);
        const category = pkg?.category_id 
          ? categoriesMap.get(pkg.category_id) 
          : null;

        return {
          ...order,
          package: pkg || null,
          profile: { company_name: clientName, full_name: profile?.full_name },
          category
        };
      }) as DesignOrder[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const isOrderComplete = (order: DesignOrder) => {
    const isFinalDelivery = (order.revisions_used || 0) >= (order.max_revisions || 2);
    return order.status === 'approved' || (isFinalDelivery && order.status === 'delivered');
  };

  const getDisplayStatus = (order: DesignOrder) => {
    if (isOrderComplete(order)) return 'completed';
    return order.status;
  };

  // Sort and filter orders (category filter now server-side)
  const processedOrders = [...(orders || [])]
    .filter(order => {
      // Client-side search on client name (profile data comes from batch fetch)
      const orderTitle = order.package?.name || 'Pedido de Design';
      const matchesSearch = !debouncedSearch || 
        orderTitle.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.profile?.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.profile?.company_name?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Filter completed orders when looking at "approved" tab
      if (filter === "completed") {
        return matchesSearch && isOrderComplete(order);
      }
      
      return matchesSearch;
    })
    .sort((a, b) => {
      const aComplete = isOrderComplete(a);
      const bComplete = isOrderComplete(b);
      if (aComplete && !bComplete) return 1;
      if (!aComplete && bComplete) return -1;
      
      if (a.status === 'revision_requested' && b.status !== 'revision_requested') return -1;
      if (b.status === 'revision_requested' && a.status !== 'revision_requested') return 1;
      
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      
      if (!aComplete && !bComplete) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Pagination
  const pagination = usePagination(processedOrders, { pageSize: 20 });

  const isBrandOrder = (order: DesignOrder) => 
    order.package?.category_id === 'cat-brand' || order.category?.id === 'cat-brand';

  // Get stats from all orders (separate query for performance)
  const { data: allOrders } = useQuery({
    queryKey: ['admin-design-orders-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_orders')
        .select('status, revisions_used, max_revisions');
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const stats = {
    pending: allOrders?.filter(o => o.status === 'pending').length || 0,
    in_progress: allOrders?.filter(o => o.status === 'in_progress').length || 0,
    delivered: allOrders?.filter(o => o.status === 'delivered' && !((o.revisions_used || 0) >= (o.max_revisions || 2))).length || 0,
    revision: allOrders?.filter(o => o.status === 'revision_requested').length || 0,
    completed: allOrders?.filter(o => o.status === 'approved' || ((o.revisions_used || 0) >= (o.max_revisions || 2) && o.status === 'delivered')).length || 0,
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Design Digital" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Pedidos de Design</h1>
            <p className="text-muted-foreground">Gerencie os pedidos de design digital</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.in_progress}</p>
                  <p className="text-xs text-muted-foreground">Em Produção</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.revision}</p>
                  <p className="text-xs text-muted-foreground">Em Revisão</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.id === 'cat-brand' && <Palette className="h-3 w-3 mr-1 inline" />}
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="revision" className="text-orange-600">Revisão ({stats.revision})</TabsTrigger>
              <TabsTrigger value="pending">Aguardando</TabsTrigger>
              <TabsTrigger value="in_progress">Produção</TabsTrigger>
              <TabsTrigger value="delivered">Entregues</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Orders list */}
        {ordersError ? (
          <ErrorState
            title="Erro ao carregar pedidos"
            message="Não foi possível carregar a lista de pedidos de design. Tente novamente."
            onRetry={() => refetchOrders()}
            variant="compact"
          />
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pagination.paginatedData.length > 0 ? (
          <>
            <div className="space-y-3">
              {pagination.paginatedData.map((order) => {
                const displayStatusKey = getDisplayStatus(order);
                const status = statusConfig[displayStatusKey] || statusConfig.pending;
                const orderTitle = order.package?.name || 'Pedido de Design';
                const orderPrice = order.package?.price || 0;
                const isBrand = isBrandOrder(order);
                const isComplete = isOrderComplete(order);
                const urgency = getOrderUrgency(order, slaConfig);
                
                return (
                  <Link key={order.id} to={`/admin/design/${order.id}`}>
                    <Card className={`hover:border-primary/50 transition-colors cursor-pointer ${
                      urgency?.level === 'overdue' ? 'border-destructive/50 bg-destructive/5' :
                      urgency?.level === 'urgent' ? 'border-orange-500/50 bg-orange-500/5' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {urgency?.level === 'overdue' && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Atrasado
                                </Badge>
                              )}
                              {urgency?.level === 'urgent' && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Urgente
                                </Badge>
                              )}
                              {isBrand && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                                  <Palette className="h-3 w-3 mr-1" />
                                  Marca
                                </Badge>
                              )}
                              <h3 className="font-semibold text-foreground">{orderTitle}</h3>
                              <Badge variant="outline" className={status.color}>
                                {status.icon}
                                <span className="ml-1">{status.label}</span>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{order.profile?.company_name || order.profile?.full_name || 'Cliente'}</span>
                              {order.category && !isBrand && (
                                <>
                                  <span>•</span>
                                  <span>{order.category.name}</span>
                                </>
                              )}
                              {urgency && !isComplete && (
                                <>
                                  <span>•</span>
                                  <span className={urgency.level === 'overdue' ? 'text-destructive font-medium' : urgency.level === 'urgent' ? 'text-orange-600' : ''}>
                                    {urgency.level === 'overdue' ? `Atrasado ${urgency.timeRemaining}` : `${urgency.timeRemaining} restantes`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-right">
                              <p className="font-medium text-foreground">R$ {orderPrice.toLocaleString('pt-BR')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className={`${order.revisions_used >= order.max_revisions ? 'text-destructive' : ''}`}>
                                {order.revisions_used}/{order.max_revisions} revisões
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              pageSize={pagination.pageSize}
              onPageChange={pagination.goToPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {search || categoryFilter !== 'all' || filter !== 'all' 
                  ? 'Tente ajustar os filtros' 
                  : 'Os pedidos aparecerão aqui'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayoutWithSidebar>
  );
}
