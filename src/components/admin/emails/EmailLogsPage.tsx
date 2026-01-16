import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Mail, RefreshCw, Search, CheckCircle2, XCircle, Clock, SkipForward, ChevronDown, AlertTriangle, UserX, Ban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { QUERY_STALE_TIME } from "@/lib/queryConfig";

interface EmailLog {
  id: string;
  template_slug: string | null;
  template_name: string | null;
  recipient_email: string;
  subject: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  variables: Record<string, string>;
  triggered_by: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function EmailLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["email-logs", statusFilter, triggerFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (triggerFilter !== "all") {
        query = query.eq("triggered_by", triggerFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
    staleTime: QUERY_STALE_TIME.DYNAMIC,
  });

  const filteredLogs = logs?.filter(log => 
    log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.error_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedData,
    startIndex,
    endIndex,
    pageSize,
    goToPage,
    setPageSize,
  } = usePagination(filteredLogs, { pageSize: 20 });

  const stats = logs?.reduce(
    (acc, log) => {
      acc.total++;
      if (log.status === "sent") acc.sent++;
      if (log.status === "failed") acc.failed++;
      if (log.status === "skipped") acc.skipped++;
      return acc;
    },
    { total: 0, sent: 0, failed: 0, skipped: 0 }
  ) || { total: 0, sent: 0, failed: 0, skipped: 0 };

  const getSkipReason = (metadata: Record<string, any> | null) => {
    const reason = metadata?.reason;
    switch (reason) {
      case "user_not_found":
        return { icon: UserX, text: "Usuário não encontrado", color: "text-orange-500" };
      case "invalid_recipient_format":
        return { icon: Ban, text: "Formato inválido", color: "text-red-500" };
      case "Template inactive":
        return { icon: AlertTriangle, text: "Template inativo", color: "text-yellow-500" };
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, metadata?: Record<string, any>) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      case "skipped": {
        const skipInfo = getSkipReason(metadata || null);
        const Icon = skipInfo?.icon || SkipForward;
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
            <Icon className="h-3 w-3" />
            Pulado
          </Badge>
        );
      }
      case "pending":
        return (
          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      case "webhook":
        return <Badge variant="secondary">Webhook</Badge>;
      case "cron":
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">Automático</Badge>;
      case "queue":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Fila</Badge>;
      case "app":
        return <Badge className="bg-indigo-500/20 text-indigo-600 border-indigo-500/30">App</Badge>;
      case "system":
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30">Sistema</Badge>;
      case "request-password-reset":
        return <Badge variant="outline">Recuperação</Badge>;
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Enviados</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Falhas</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pulados</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.skipped}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Histórico de Emails
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardTitle>
          <CardDescription>
            Acompanhe todos os emails enviados pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, assunto ou template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="failed">Falhas</SelectItem>
                <SelectItem value="skipped">Pulados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Gatilho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="cron">Automático</SelectItem>
                <SelectItem value="queue">Fila</SelectItem>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="request-password-reset">Recuperação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedData && paginatedData.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedData.map((log) => {
                  const skipInfo = log.status === "skipped" ? getSkipReason(log.metadata) : null;
                  const hasDetails = log.metadata && Object.keys(log.metadata).length > 0;
                  
                  return (
                    <Collapsible
                      key={log.id}
                      open={expandedId === log.id}
                      onOpenChange={(open) => setExpandedId(open ? log.id : null)}
                    >
                      <div
                        className={`p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                          log.status === "failed" ? "border-red-500/30" : 
                          log.status === "skipped" ? "border-yellow-500/30" : ""
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{log.subject}</span>
                              {getStatusBadge(log.status, log.metadata)}
                              {getTriggerBadge(log.triggered_by)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Para: <span className="font-mono text-xs">{log.recipient_email}</span>
                            </div>
                            {log.template_name && (
                              <div className="text-sm text-muted-foreground">
                                Template: {log.template_name}
                              </div>
                            )}
                            {log.error_message && (
                              <div className="text-sm text-red-500 mt-1 flex items-start gap-1">
                                <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span>{log.error_message}</span>
                              </div>
                            )}
                            {skipInfo && (
                              <div className={`text-sm mt-1 flex items-center gap-1 ${skipInfo.color}`}>
                                <skipInfo.icon className="h-3.5 w-3.5" />
                                <span>{skipInfo.text}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                            {hasDetails && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === log.id ? "rotate-180" : ""}`} />
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </div>
                        
                        <CollapsibleContent className="mt-3 pt-3 border-t">
                          <div className="space-y-2 text-sm">
                            {log.resend_id && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Resend ID:</span>
                                <span className="font-mono text-xs">{log.resend_id}</span>
                              </div>
                            )}
                            {log.metadata?.queue_id && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Queue ID:</span>
                                <span className="font-mono text-xs">{log.metadata.queue_id}</span>
                              </div>
                            )}
                            {log.metadata?.attempts && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Tentativas:</span>
                                <span>{log.metadata.attempts} de {log.metadata.max_attempts || 3}</span>
                              </div>
                            )}
                            {log.metadata?.unresolved_user_ids && (
                              <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">IDs não resolvidos:</span>
                                <div className="font-mono text-xs bg-muted p-2 rounded">
                                  {log.metadata.unresolved_user_ids.join(", ")}
                                </div>
                              </div>
                            )}
                            {log.metadata?.reason && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Motivo:</span>
                                <span>{log.metadata.reason}</span>
                              </div>
                            )}
                            {log.variables && Object.keys(log.variables).length > 0 && (
                              <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Variáveis:</span>
                                <div className="font-mono text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                                  {JSON.stringify(log.variables, null, 2)}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                pageSize={pageSize}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
              />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum email encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
