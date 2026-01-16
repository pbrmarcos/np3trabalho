import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientDesignServiceCardProps {
  userId: string;
}

export default function ClientDesignServiceCard({ userId }: ClientDesignServiceCardProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['design-orders-summary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_orders')
        .select('id, status')
        .eq('client_id', userId)
        .eq('payment_status', 'paid');
      
      if (error) throw error;
      return (data || []) as { id: string; status: string }[];
    },
  });

  const pendingCount = orders?.filter((o: any) => ['pending', 'in_progress', 'delivered'].includes(o.status)).length || 0;
  const approvedCount = orders?.filter(o => o.status === 'approved').length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Design Digital
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {pendingCount} em andamento
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Artes para redes sociais, papelaria, banners, apresentações e muito mais.
        </p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {orders?.length || 0} pedido{orders?.length !== 1 ? 's' : ''}
            </span>
          </div>
          {approvedCount > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-600/30">
              {approvedCount} concluído{approvedCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button asChild variant="default" size="sm" className="flex-1">
            <Link to="/design/checkout">
              Fazer Pedido
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {orders && orders.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/cliente/design">
                Ver Pedidos
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
