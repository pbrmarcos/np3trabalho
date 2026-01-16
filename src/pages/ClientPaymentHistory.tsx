import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Receipt, RefreshCw, CheckCircle2, Calendar, ExternalLink, FileText } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: string;
  type: 'one_time' | 'subscription';
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string;
  billing_period?: string;
  plan_id?: string;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plan_name: string;
  amount: number;
  interval: string;
}

export default function ClientPaymentHistory() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-payment-history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as { payments: Payment[]; subscriptions: Subscription[] };
    },
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Histórico de Pagamentos" }
  ];

  const getBillingPeriodLabel = (period?: string) => {
    switch (period) {
      case 'semester': return '6 meses';
      case 'annual': return '12 meses';
      case 'biennial': return '24 meses';
      default: return null;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD',
    }).format(amount);
  };

  return (
    <ClientLayout breadcrumbs={breadcrumbs} title="Histórico de Pagamentos">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico de Pagamentos</h1>
              <p className="text-muted-foreground">Todos os seus pagamentos e assinaturas</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Active Subscriptions */}
        {data?.subscriptions && data.subscriptions.length > 0 && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="h-5 w-5 text-green-500" />
                Assinaturas Ativas
              </CardTitle>
              <CardDescription>Suas assinaturas recorrentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.subscriptions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-4 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{sub.plan_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Próxima cobrança: {format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatCurrency(sub.amount, 'BRL')}/mês
                    </p>
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Ativa
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>Todos os pagamentos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !data?.payments || data.payments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(payment.created), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{payment.description}</p>
                            {payment.billing_period && (
                              <p className="text-xs text-muted-foreground">
                                Período: {getBillingPeriodLabel(payment.billing_period)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            payment.type === 'subscription' 
                              ? 'border-blue-500 text-blue-600' 
                              : 'border-green-500 text-green-600'
                          }>
                            {payment.type === 'subscription' ? (
                              <><RefreshCw className="h-3 w-3 mr-1" /> Recorrente</>
                            ) : (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Único</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500">
                            Pago
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.invoice_pdf && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(payment.invoice_pdf, '_blank')}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.hosted_invoice_url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(payment.hosted_invoice_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
