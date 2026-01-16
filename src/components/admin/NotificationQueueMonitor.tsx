import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Mail, Trash2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

interface QueueItem {
  id: string;
  template_slug: string;
  recipients: string[];
  status: string;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export function NotificationQueueMonitor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, refetch: refetchStats, isLoading: loadingStats } = useQuery({
    queryKey: ["notification-queue-stats"],
    queryFn: async (): Promise<QueueStats> => {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("status");

      if (error) throw error;

      const counts = {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        total: data?.length || 0,
      };

      data?.forEach((item) => {
        if (item.status in counts) {
          counts[item.status as keyof typeof counts]++;
        }
      });

      return counts;
    },
    refetchInterval: 10000,
  });

  const { data: recentItems, refetch: refetchItems, isLoading: loadingItems } = useQuery({
    queryKey: ["notification-queue-recent"],
    queryFn: async (): Promise<QueueItem[]> => {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as QueueItem[];
    },
    refetchInterval: 10000,
  });

  const { data: oldItemsCount } = useQuery({
    queryKey: ["notification-queue-old-items-count"],
    queryFn: async (): Promise<number> => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { count, error } = await supabase
        .from("notification_queue")
        .select("*", { count: "exact", head: true })
        .in("status", ["failed", "skipped", "sent"])
        .lt("processed_at", sevenDaysAgo);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: consecutiveFailures } = useQuery({
    queryKey: ["notification-queue-consecutive-failures"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("status")
        .order("processed_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      let count = 0;
      for (const item of data || []) {
        if (item.status === "failed") count++;
        else break;
      }
      return count;
    },
    refetchInterval: 30000,
  });

  const handleManualProcess = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("process-notification-queue");
      if (error) throw error;
      toast.success("Fila processada com sucesso");
      refetchStats();
      refetchItems();
    } catch (err: any) {
      toast.error("Erro ao processar fila: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupOldItems = async () => {
    setIsCleaning(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { error } = await supabase
        .from("notification_queue")
        .delete()
        .in("status", ["failed", "skipped", "sent"])
        .lt("processed_at", sevenDaysAgo);

      if (error) throw error;
      
      toast.success("Itens antigos removidos com sucesso");
      refetchStats();
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ["notification-queue-old-items-count"] });
    } catch (err: any) {
      toast.error("Erro ao limpar itens: " + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchItems();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processando</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Enviado</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "skipped":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Ignorado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasConsecutiveFailureAlert = (consecutiveFailures || 0) >= 3;

  return (
    <div className="space-y-6">
      {hasConsecutiveFailureAlert && (
        <Card className="border-red-500 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">
                  Alerta: {consecutiveFailures} falhas consecutivas detectadas
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Verifique a configuração do Resend e os logs de erro abaixo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Fila de Notificações
        </h3>
        <div className="flex gap-2 flex-wrap">
          {(oldItemsCount || 0) > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCleanupOldItems} 
              disabled={isCleaning}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isCleaning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Limpar Antigos ({oldItemsCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingStats || loadingItems}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats || loadingItems ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleManualProcess} disabled={isProcessing}>
            {isProcessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Processar Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.processing || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ignorados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats?.skipped || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingItems ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : !recentItems?.length ? (
            <div className="text-center py-4 text-muted-foreground">Nenhum item na fila</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{item.template_slug}</code>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      Para: {item.recipients.join(", ")}
                    </div>
                    {item.error_message && (
                      <div className="text-xs text-red-500 mt-1 truncate" title={item.error_message}>
                        Erro: {item.error_message}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground ml-4 shrink-0">
                    <div>{format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}</div>
                    <div>Tentativas: {item.attempts}/{item.max_attempts}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
