import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Package, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight, Palette } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ErrorState from "@/components/ErrorState";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment: { label: "Aguardando Pagamento", color: "bg-gray-500/10 text-gray-600 border-gray-500/30", icon: <Clock className="h-3 w-3" /> },
  pending: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "Em Produção", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  delivered: { label: "Entregue", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: <Package className="h-3 w-3" /> },
  revision_requested: { label: "Em Revisão", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { label: "✅ Concluído", color: "bg-green-600/20 text-green-700 border-green-600/40", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertCircle className="h-3 w-3" /> },
};

interface DesignOrder {
  id: string;
  status: string;
  payment_status: string;
  revisions_used: number;
  max_revisions: number;
  created_at: string;
  notes: string | null;
  package_id: string;
  package: { 
    name: string; 
    price: number;
    category_id: string;
    category: { id: string; name: string } | null;
  } | null;
}

const isBrandOrder = (order: DesignOrder) => 
  order.package?.category_id === 'cat-brand' || order.package?.category?.id === 'cat-brand';

export default function ClientDesignOrders() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error: ordersError, refetch } = useQuery({
    queryKey: ['design-orders', user?.id],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from('design_orders')
        .select('*')
        .eq('client_id', user?.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) return [];

      // Batch fetch packages (no FK relationship)
      const packageIds = [...new Set(ordersData.map(o => o.package_id).filter(Boolean))] as string[];
      const { data: packagesData } = await supabase
        .from('design_packages')
        .select('id, name, price, category_id')
        .in('id', packageIds);
      
      // Batch fetch categories
      const categoryIds = [...new Set(packagesData?.map(p => p.category_id).filter(Boolean))] as string[];
      const { data: categoriesData } = categoryIds.length > 0
        ? await supabase.from('design_service_categories').select('id, name').in('id', categoryIds)
        : { data: [] };

      const packagesMap = new Map((packagesData || []).map(p => [p.id, p] as const));
      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c] as const));

      return ordersData.map((order: any) => {
        const pkg = packagesMap.get(order.package_id);
        const category = pkg?.category_id ? categoriesMap.get(pkg.category_id) : null;
        
        return {
          ...order,
          package: pkg ? { ...pkg, category } : null
        };
      }) as DesignOrder[];
    },
    enabled: !!user?.id,
  });

  // Handle payment success confirmation
  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentSuccess = searchParams.get("payment_success");

    if (orderId && paymentSuccess === "true" && !isConfirming) {
      setIsConfirming(true);
      
      const confirmOrder = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("Sessão expirada. Por favor, faça login novamente.");
            return;
          }

          const response = await supabase.functions.invoke('confirm-design-order', {
            body: { order_id: orderId },
          });

          if (response.error) {
            console.error("Error confirming order:", response.error);
            toast.error("Erro ao confirmar pedido. Tente novamente.");
          } else {
            toast.success("Pedido confirmado com sucesso! Em breve nossa equipe iniciará a produção.");
            // Clear URL params
            setSearchParams({});
            // Refetch orders
            refetch();
            queryClient.invalidateQueries({ queryKey: ['design-orders'] });
          }
        } catch (error) {
          console.error("Error confirming order:", error);
          toast.error("Erro ao confirmar pedido.");
        } finally {
          setIsConfirming(false);
        }
      };

      confirmOrder();
    }
  }, [searchParams, isConfirming, refetch, queryClient, setSearchParams]);

  // Helper to check if order is complete
  const isOrderComplete = (order: DesignOrder) => {
    const isFinalDelivery = (order.revisions_used || 0) >= (order.max_revisions || 2);
    return order.status === 'approved' || (isFinalDelivery && order.status === 'delivered');
  };

  // Helper to get display status
  const getDisplayStatus = (order: DesignOrder) => {
    if (isOrderComplete(order)) return 'completed';
    return order.status;
  };

  const filteredOrders = orders?.filter(order => {
    if (filter === "all") return true;
    if (filter === "active") return ['pending', 'in_progress', 'delivered', 'revision_requested'].includes(order.status) && !isOrderComplete(order);
    if (filter === "approved") return isOrderComplete(order);
    return true;
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Design Digital" }
  ];

  // Get progress bar color based on status
  const getProgressColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'delivered': return 'bg-purple-500';
      case 'in_progress': return 'bg-blue-500';
      case 'revision_requested': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  // Calculate progress percentage
  const getProgressPercent = (status: string) => {
    const progressSteps = ['pending', 'in_progress', 'delivered', 'approved'];
    const currentStep = progressSteps.indexOf(status === 'revision_requested' ? 'in_progress' : status);
    return status === 'approved' ? 100 : Math.max(((currentStep + 1) / progressSteps.length) * 100, 25);
  };

  return (
    <ClientLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Meus Pedidos de Design</h1>
            <p className="text-muted-foreground">Acompanhe seus pedidos de design digital</p>
          </div>
          <Button asChild>
            <Link to="/design/checkout">
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Link>
          </Button>
        </div>

        {isConfirming && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-foreground font-medium">Confirmando seu pedido...</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos ({orders?.length || 0})</TabsTrigger>
            <TabsTrigger value="active">
              Em Aberto ({orders?.filter(o => !isOrderComplete(o) && ['pending', 'in_progress', 'delivered', 'revision_requested'].includes(o.status)).length || 0})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Concluídos ({orders?.filter(o => isOrderComplete(o)).length || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {ordersError ? (
          <ErrorState
            title="Erro ao carregar pedidos"
            message="Não foi possível carregar seus pedidos de design. Tente novamente."
            onRetry={() => refetch()}
            variant="compact"
          />
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              const displayStatusKey = getDisplayStatus(order);
              const status = statusConfig[displayStatusKey] || statusConfig.pending;
              const packageName = order.package?.name || "Design";
              const categoryName = order.package?.category?.name || "Design Digital";
              const price = order.package?.price || 0;
              const isComplete = isOrderComplete(order);
              const progressPercent = isComplete ? 100 : getProgressPercent(order.status);
              const progressColor = isComplete ? 'bg-green-600' : getProgressColor(order.status);
              const isBrand = isBrandOrder(order);
              
              return (
                <Link key={order.id} to={`/cliente/design/${order.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Vertical progress indicator */}
                        <div className="hidden sm:block w-1.5 bg-muted relative overflow-hidden">
                          <div 
                            className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${progressColor}`}
                            style={{ height: `${progressPercent}%` }}
                          />
                        </div>
                        {/* Horizontal progress indicator for mobile */}
                        <div className="sm:hidden h-1 bg-muted relative overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isBrand && (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                                    <Palette className="h-3 w-3 mr-1" />
                                    Marca
                                  </Badge>
                                )}
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{packageName}</h3>
                                <Badge variant="outline" className={`${status.color} transition-all`}>
                                  {status.icon}
                                  <span className="ml-1">{status.label}</span>
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{categoryName}</p>
                              <p className="text-xs text-muted-foreground">
                                #{order.id.slice(0, 8)} • {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-semibold text-foreground">
                                  R$ {Number(price).toFixed(2).replace('.', ',')}
                                </p>
                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                  <span className={order.revisions_used > 0 ? 'text-orange-500' : ''}>
                                    {order.revisions_used}/{order.max_revisions} revisões
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="hidden sm:block h-5 w-5 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground mb-4">Você ainda não fez nenhum pedido de design.</p>
              <Button asChild>
                <Link to="/design/checkout">
                  <Plus className="mr-2 h-4 w-4" />
                  Fazer Primeiro Pedido
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
