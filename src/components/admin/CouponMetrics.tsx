import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TicketPercent, Tag, TrendingUp, DollarSign, Users, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CouponMetrics {
  totalCoupons: number;
  activeCoupons: number;
  totalPromoCodes: number;
  activePromoCodes: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  conversionRate: number;
  couponUsage: Array<{
    id: string;
    name: string;
    redemptions: number;
    discountGiven: number;
  }>;
  recentRedemptions: Array<{
    code: string;
    couponName: string;
    timesRedeemed: number;
    discount: string;
  }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function CouponMetrics() {
  const { data: metrics, isLoading, error } = useQuery<CouponMetrics>({
    queryKey: ["coupon-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "get_coupon_metrics" },
      });
      if (error) throw error;
      return data.metrics;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar métricas de cupons
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Ativos
            </CardTitle>
            <TicketPercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeCoupons || 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {metrics?.totalCoupons || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Códigos Ativos
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activePromoCodes || 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {metrics?.totalPromoCodes || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Resgates
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics?.totalRedemptions || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Desconto Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(metrics?.totalDiscountGiven || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Taxa de Conversão com Cupom
            </CardTitle>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {metrics?.conversionRate || 0}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={metrics?.conversionRate || 0} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            Percentual de compras que utilizaram cupom de desconto
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Coupons by Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TicketPercent className="h-5 w-5" />
              Cupons Mais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.couponUsage && metrics.couponUsage.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cupom</TableHead>
                    <TableHead className="text-right">Resgates</TableHead>
                    <TableHead className="text-right">Desconto Dado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.couponUsage.slice(0, 5).map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium">{coupon.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{coupon.redemptions}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-orange-500">
                        {formatCurrency(coupon.discountGiven)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TicketPercent className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cupom utilizado ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Promo Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Códigos Mais Resgatados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.recentRedemptions && metrics.recentRedemptions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead className="text-right">Resgates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentRedemptions.slice(0, 5).map((promo, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <code className="font-mono font-bold text-primary">
                          {promo.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{promo.discount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{promo.timesRedeemed}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum código resgatado ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
