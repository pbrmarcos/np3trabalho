import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import RevenueForecasting from "@/components/admin/RevenueForecasting";
import CouponMetrics from "@/components/admin/CouponMetrics";
import { 
  DollarSign, 
  CreditCard, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  RotateCcw,
  ChartLine,
  TicketPercent
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialData {
  stats: {
    totalRevenue: number;
    mrr: number;
    activeSubscriptions: number;
    pendingDesignOrders: number;
    paymentSuccessRate: number;
    totalCustomers: number;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    customerEmail: string | null;
    customerName: string | null;
    planName: string;
    amount: number;
    currency: string;
    interval: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    createdAt: string | null;
  }>;
  paymentIntents: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    customerEmail: string | null;
    createdAt: string | null;
  }>;
  invoices: Array<{
    id: string;
    number: string | null;
    amount: number;
    currency: string;
    status: string;
    billingReason: string | null;
    customerEmail: string | null;
    createdAt: string | null;
    paidAt: string | null;
    discountAmount: number | null;
    couponName: string | null;
    couponCode: string | null;
  }>;
  failedPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    lastPaymentError: string | null;
    createdAt: string | null;
  }>;
  refunds: Array<{
    id: string;
    paymentIntentId: string | null;
    amount: number;
    currency: string;
    customerEmail: string | null;
    description: string | null;
    createdAt: string | null;
  }>;
  designOrders: Array<{
    id: string;
    client_id: string;
    package_id: string;
    status: string;
    payment_status: string;
    created_at: string | null;
    client_email: string;
    client_name: string;
    design_packages: {
      name: string;
      price: number;
    } | null;
  }>;
}

const formatCurrency = (value: number, currency = "brl") => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active: { variant: "default", label: "Ativo" },
    canceled: { variant: "destructive", label: "Cancelado" },
    past_due: { variant: "secondary", label: "Vencido" },
    trialing: { variant: "outline", label: "Trial" },
    succeeded: { variant: "default", label: "Sucesso" },
    requires_payment_method: { variant: "destructive", label: "Falhou" },
    paid: { variant: "default", label: "Pago" },
    open: { variant: "secondary", label: "Aberto" },
    draft: { variant: "outline", label: "Rascunho" },
    pending: { variant: "secondary", label: "Pendente" },
    refunded: { variant: "outline", label: "Reembolsado" },
  };

  const config = statusConfig[status] || { variant: "outline" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function AdminFinanceiro() {
  const [period, setPeriod] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("forecast");

  const { data, isLoading, error, refetch, isFetching } = useQuery<FinancialData>({
    queryKey: ["financial-data", period],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("get-financial-data", {
        body: { period },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    staleTime: 60000,
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin" },
    { label: "Financeiro" },
  ];

  const filterBySearch = <T extends { customerEmail?: string | null; client_email?: string }>(
    items: T[]
  ): T[] => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      const email = item.customerEmail || item.client_email || "";
      return email.toLowerCase().includes(term);
    });
  };

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Controle Financeiro</h1>
            <p className="text-muted-foreground">Visão geral de receitas, assinaturas e pagamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita no Período
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(data?.stats.totalRevenue || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MRR (Receita Recorrente)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(data?.stats.mrr || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assinaturas Ativas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {data?.stats.activeSubscriptions || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Sucesso
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {data?.stats.paymentSuccessRate || 0}%
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="forecast">
              <ChartLine className="h-3 w-3 mr-1" />
              Previsão
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="invoices">Faturas</TabsTrigger>
            <TabsTrigger value="coupons">
              <TicketPercent className="h-3 w-3 mr-1" />
              Cupons
            </TabsTrigger>
            <TabsTrigger value="refunds">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reembolsos
              {data?.refunds && data.refunds.length > 0 && (
                <Badge variant="outline" className="ml-2 h-5 w-5 p-0 text-xs">
                  {data.refunds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="failed">
              Falhas
              {data?.failedPayments && data.failedPayments.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {data.failedPayments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <RevenueForecasting
                stats={data?.stats || { mrr: 0, totalRevenue: 0, activeSubscriptions: 0, pendingDesignOrders: 0 }}
                subscriptions={data?.subscriptions || []}
                designOrders={data?.designOrders || []}
              />
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima Cobrança</TableHead>
                      <TableHead>Início</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : filterBySearch(data?.subscriptions || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma assinatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterBySearch(data?.subscriptions || []).map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.customerName || "—"}</div>
                              <div className="text-sm text-muted-foreground">{sub.customerEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>{sub.planName || "—"}</TableCell>
                          <TableCell>
                            {formatCurrency(sub.amount, sub.currency)}/{sub.interval === "month" ? "mês" : "ano"}
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                          <TableCell>
                            {sub.createdAt ? format(new Date(sub.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : (data?.paymentIntents || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data?.paymentIntents || []).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            #{payment.id.slice(-8)}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {payment.description || "—"}
                          </TableCell>
                          <TableCell>
                            {payment.createdAt ? format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design Orders Tab */}
          <TabsContent value="design" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pacote</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : filterBySearch(data?.designOrders || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum pedido de design encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterBySearch(data?.designOrders || []).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.client_name}</div>
                              <div className="text-sm text-muted-foreground">{order.client_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{order.design_packages?.name || order.package_id}</TableCell>
                          <TableCell>
                            {formatCurrency(order.design_packages?.price || 0)}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.payment_status || "pending")}</TableCell>
                          <TableCell>
                            {order.created_at ? format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Cupom</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : (data?.invoices || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma fatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data?.invoices || []).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs">
                            {invoice.number || `#${invoice.id.slice(-8)}`}
                          </TableCell>
                          <TableCell>{invoice.customerEmail || "—"}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                          <TableCell>
                            {invoice.couponName || invoice.couponCode ? (
                              <div className="flex flex-col gap-0.5">
                                {invoice.couponCode && (
                                  <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    {invoice.couponCode}
                                  </code>
                                )}
                                {invoice.couponName && !invoice.couponCode && (
                                  <span className="text-xs text-muted-foreground">{invoice.couponName}</span>
                                )}
                                {invoice.discountAmount && invoice.discountAmount > 0 && (
                                  <span className="text-xs text-orange-500">
                                    -{formatCurrency(invoice.discountAmount, invoice.currency)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invoice.billingReason?.replace(/_/g, " ") || "—"}
                          </TableCell>
                          <TableCell>
                            {invoice.createdAt ? format(new Date(invoice.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="mt-4">
            <CouponMetrics />
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {(data?.refunds || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum reembolso</h3>
                    <p className="text-muted-foreground">Não há reembolsos registrados no período</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.refunds || []).map((refund) => (
                        <TableRow key={refund.id} className="bg-muted/30">
                          <TableCell className="font-mono text-xs">
                            #{refund.id.slice(-8)}
                          </TableCell>
                          <TableCell>{refund.customerEmail || "—"}</TableCell>
                          <TableCell>{formatCurrency(refund.amount, refund.currency)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {refund.description || "—"}
                          </TableCell>
                          <TableCell>
                            {refund.createdAt ? format(new Date(refund.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failed Payments Tab */}
          <TabsContent value="failed" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {(data?.failedPayments || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Nenhuma falha de pagamento</h3>
                    <p className="text-muted-foreground">Todos os pagamentos foram processados com sucesso</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.failedPayments || []).map((payment) => (
                        <TableRow key={payment.id} className="bg-destructive/5">
                          <TableCell className="font-mono text-xs">
                            #{payment.id.slice(-8)}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Falhou</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <span className="text-sm text-destructive">
                              {payment.lastPaymentError || "Erro desconhecido"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {payment.createdAt ? format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayoutWithSidebar>
  );
}
