import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Palette,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  UserX,
  Clock
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { addMonths, format, isSameMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubscriptionData {
  id: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  planName: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string | null;
  createdAt: string | null;
}

interface DesignOrderData {
  id: string;
  payment_status: string;
  design_packages: {
    name: string;
    price: number;
  } | null;
}

interface RevenueStats {
  mrr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  pendingDesignOrders: number;
}

interface RevenueForecastingProps {
  stats: RevenueStats;
  subscriptions: SubscriptionData[];
  designOrders: DesignOrderData[];
}

interface ForecastData {
  month: string;
  mrrProjection: number;
  renewals: number;
  renewalCount: number;
  designPipeline: number;
  total: number;
}

interface ChurnRiskSubscription {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  planName: string;
  amount: number;
  daysUntilExpiry: number;
  riskLevel: "high" | "medium" | "low";
  currentPeriodEnd: string;
}

interface RenewalByPlan {
  month: string;
  basic: number;
  professional: number;
  performance: number;
  total: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
};

export default function RevenueForecasting({ stats, subscriptions, designOrders }: RevenueForecastingProps) {
  const [scenario, setScenario] = useState<"conservative" | "optimistic">("conservative");

  const pendingDesignValue = useMemo(() => {
    return designOrders
      .filter(o => o.payment_status === "pending" && o.design_packages)
      .reduce((sum, o) => sum + (o.design_packages?.price || 0), 0);
  }, [designOrders]);

  const forecastData = useMemo(() => {
    const data: ForecastData[] = [];
    const growthRate = scenario === "optimistic" ? 0.05 : 0;

    for (let i = 0; i < 6; i++) {
      const date = addMonths(new Date(), i);
      const monthLabel = format(date, "MMM/yy", { locale: ptBR });

      // Calculate renewals for this month
      const monthRenewals = subscriptions.filter(s => {
        if (s.status !== "active" || !s.currentPeriodEnd) return false;
        return isSameMonth(new Date(s.currentPeriodEnd), date);
      });

      const renewalValue = monthRenewals.reduce((sum, s) => sum + s.amount, 0);
      const projectedMrr = stats.mrr * Math.pow(1 + growthRate, i);

      data.push({
        month: monthLabel,
        mrrProjection: Math.round(projectedMrr),
        renewals: renewalValue,
        renewalCount: monthRenewals.length,
        designPipeline: i === 0 ? pendingDesignValue : 0,
        total: Math.round(projectedMrr + (i === 0 ? pendingDesignValue : 0)),
      });
    }

    return data;
  }, [stats.mrr, subscriptions, pendingDesignValue, scenario]);

  const renewalsByPlan = useMemo(() => {
    const data: RenewalByPlan[] = [];

    for (let i = 0; i < 6; i++) {
      const date = addMonths(new Date(), i);
      const monthLabel = format(date, "MMM/yy", { locale: ptBR });

      const monthRenewals = subscriptions.filter(s => {
        if (s.status !== "active" || !s.currentPeriodEnd) return false;
        return isSameMonth(new Date(s.currentPeriodEnd), date);
      });

      const basicRenewals = monthRenewals
        .filter(s => s.planName?.toLowerCase().includes("essencial") || s.planName?.toLowerCase().includes("basic"))
        .reduce((sum, s) => sum + s.amount, 0);

      const professionalRenewals = monthRenewals
        .filter(s => s.planName?.toLowerCase().includes("profissional") || s.planName?.toLowerCase().includes("professional"))
        .reduce((sum, s) => sum + s.amount, 0);

      const performanceRenewals = monthRenewals
        .filter(s => s.planName?.toLowerCase().includes("performance") || s.planName?.toLowerCase().includes("ecommerce"))
        .reduce((sum, s) => sum + s.amount, 0);

      data.push({
        month: monthLabel,
        basic: basicRenewals,
        professional: professionalRenewals,
        performance: performanceRenewals,
        total: basicRenewals + professionalRenewals + performanceRenewals,
      });
    }

    return data;
  }, [subscriptions]);

  // Churn Risk Analysis - subscriptions expiring within 30 days
  const churnRiskSubscriptions = useMemo(() => {
    const now = new Date();
    const riskSubs: ChurnRiskSubscription[] = [];

    subscriptions
      .filter(s => s.status === "active" && s.currentPeriodEnd)
      .forEach(sub => {
        const expiryDate = new Date(sub.currentPeriodEnd!);
        const daysUntilExpiry = differenceInDays(expiryDate, now);

        // Only consider subscriptions expiring within next 30 days
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
          // Determine risk level based on days until expiry and subscription age
          let riskLevel: "high" | "medium" | "low" = "low";
          
          // High risk: expiring within 7 days OR new subscribers (less than 60 days old)
          const createdDate = sub.createdAt ? new Date(sub.createdAt) : null;
          const subscriptionAgeDays = createdDate ? differenceInDays(now, createdDate) : 999;
          
          if (daysUntilExpiry <= 7) {
            riskLevel = "high";
          } else if (daysUntilExpiry <= 14 || subscriptionAgeDays < 60) {
            riskLevel = "medium";
          }

          riskSubs.push({
            id: sub.id,
            customerEmail: sub.customerEmail,
            customerName: sub.customerName,
            planName: sub.planName,
            amount: sub.amount,
            daysUntilExpiry,
            riskLevel,
            currentPeriodEnd: sub.currentPeriodEnd!,
          });
        }
      });

    // Sort by risk level (high first) then by days until expiry
    return riskSubs.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }, [subscriptions]);

  const churnRiskStats = useMemo(() => {
    const high = churnRiskSubscriptions.filter(s => s.riskLevel === "high");
    const medium = churnRiskSubscriptions.filter(s => s.riskLevel === "medium");
    const low = churnRiskSubscriptions.filter(s => s.riskLevel === "low");

    return {
      totalAtRisk: churnRiskSubscriptions.length,
      highRisk: high.length,
      mediumRisk: medium.length,
      lowRisk: low.length,
      potentialLoss: churnRiskSubscriptions.reduce((sum, s) => sum + s.amount, 0),
      highRiskLoss: high.reduce((sum, s) => sum + s.amount, 0),
    };
  }, [churnRiskSubscriptions]);

  const totalForecast = useMemo(() => {
    return forecastData.reduce((sum, d) => sum + d.total, 0);
  }, [forecastData]);

  const next3MonthsRevenue = useMemo(() => {
    return forecastData.slice(0, 3).reduce((sum, d) => sum + d.total, 0);
  }, [forecastData]);

  const nextMonthRevenue = forecastData[0]?.total || 0;

  const trend = useMemo(() => {
    if (forecastData.length < 2) return 0;
    const first = forecastData[0].mrrProjection;
    const last = forecastData[forecastData.length - 1].mrrProjection;
    return ((last - first) / first) * 100;
  }, [forecastData]);

  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
  const trendColor = trend > 0 ? "text-green-500" : trend < 0 ? "text-destructive" : "text-muted-foreground";

  const getRiskBadge = (level: "high" | "medium" | "low") => {
    const config = {
      high: { variant: "destructive" as const, label: "Alto" },
      medium: { variant: "secondary" as const, label: "Médio" },
      low: { variant: "outline" as const, label: "Baixo" },
    };
    return <Badge variant={config[level].variant}>{config[level].label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Scenario Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Cenário:</span>
        <div className="flex rounded-lg border p-1">
          <Button
            variant={scenario === "conservative" ? "default" : "ghost"}
            size="sm"
            onClick={() => setScenario("conservative")}
            className="h-7 px-3 text-xs"
          >
            Conservador
          </Button>
          <Button
            variant={scenario === "optimistic" ? "default" : "ghost"}
            size="sm"
            onClick={() => setScenario("optimistic")}
            className="h-7 px-3 text-xs"
          >
            Otimista (+5%/mês)
          </Button>
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Mês
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(nextMonthRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MRR + Design Pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos 3 Meses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(next3MonthsRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projeção acumulada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Design
            </CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(pendingDesignValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tendência 6 Meses
            </CardTitle>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scenario === "optimistic" ? "Crescimento estimado" : "Estável"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projeção de Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={formatShortCurrency}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorMrr)"
                    name="Receita Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Renewals by Plan Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Renovações por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={renewalsByPlan}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={formatShortCurrency}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        basic: "Essencial",
                        professional: "Profissional",
                        performance: "Performance"
                      };
                      return [formatCurrency(value), labels[name] || name];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        basic: "Essencial",
                        professional: "Profissional",
                        performance: "Performance"
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Bar dataKey="basic" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="professional" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="performance" stackId="a" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Section */}
      {churnRiskStats.totalAtRisk > 0 && (
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Risco de Churn
                <Badge variant="destructive" className="ml-2">
                  {churnRiskStats.totalAtRisk} assinaturas
                </Badge>
              </CardTitle>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Perda potencial</div>
                <div className="text-lg font-bold text-destructive">
                  {formatCurrency(churnRiskStats.potentialLoss)}/mês
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Risk Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Alto Risco</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{churnRiskStats.highRisk}</div>
                <div className="text-xs text-muted-foreground">Vencendo em até 7 dias</div>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Médio Risco</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{churnRiskStats.mediumRisk}</div>
                <div className="text-xs text-muted-foreground">Vencendo em 8-14 dias</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Baixo Risco</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{churnRiskStats.lowRisk}</div>
                <div className="text-xs text-muted-foreground">Vencendo em 15-30 dias</div>
              </div>
            </div>

            {/* At-Risk Subscriptions Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnRiskSubscriptions.slice(0, 10).map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.customerName || "—"}</div>
                        <div className="text-sm text-muted-foreground">{sub.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.planName || "—"}</TableCell>
                    <TableCell>{formatCurrency(sub.amount)}</TableCell>
                    <TableCell>
                      {format(new Date(sub.currentPeriodEnd), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className={sub.daysUntilExpiry <= 7 ? "text-destructive font-medium" : ""}>
                        {sub.daysUntilExpiry} dias
                      </span>
                    </TableCell>
                    <TableCell>{getRiskBadge(sub.riskLevel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {churnRiskSubscriptions.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                E mais {churnRiskSubscriptions.length - 10} assinaturas em risco...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6-Month Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Previsão (6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {forecastData.map((data, idx) => (
              <div key={idx} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {data.month}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatShortCurrency(data.total)}
                </div>
                {data.renewalCount > 0 && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {data.renewalCount} renovações
                  </Badge>
                )}
                {data.designPipeline > 0 && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    +Design
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <div>
              <span className="text-muted-foreground">Total Projetado (6 meses):</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalForecast)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
