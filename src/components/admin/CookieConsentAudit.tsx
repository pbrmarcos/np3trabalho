import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Cookie, Shield, Check, X, RefreshCw, Download, Search, Filter, BarChart3, Users, Clock, Monitor, Smartphone, Globe, Mail, Eye, Trash2, Copy, Fingerprint, Timer, FileText, AlertTriangle } from "lucide-react";
import CookiePurgeDialog from "./CookiePurgeDialog";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { LGPDReportExporter } from "./LGPDReportExporter";

interface ConsentLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  session_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  consent_type: string;
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  page_url: string | null;
  country: string | null;
  region: string | null;
  device_type: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  referrer_url: string | null;
  pages_visited: number | null;
  time_on_site_seconds: number | null;
  created_at: string;
}

interface ConsentStats {
  total: number;
  acceptAll: number;
  acceptEssential: number;
  custom: number;
  reset: number;
  withPreferences: number;
  withAnalytics: number;
  withMarketing: number;
}

export default function CookieConsentAudit() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["cookie-consent-logs", filterType, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("cookie_consent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .gte("created_at", subDays(new Date(), parseInt(dateRange)).toISOString())
        .limit(500);

      if (filterType !== "all") {
        query = query.eq("consent_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConsentLog[];
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("cookie_consent_logs")
        .delete()
        .eq("session_id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cookie-consent-logs"] });
      toast({
        title: "Dados deletados",
        description: "Todos os dados de visitação desta sessão foram removidos.",
      });
      setSessionToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stats: ConsentStats = logs?.reduce(
    (acc, log) => {
      acc.total++;
      if (log.consent_type === "accept_all") acc.acceptAll++;
      if (log.consent_type === "accept_essential") acc.acceptEssential++;
      if (log.consent_type === "custom") acc.custom++;
      if (log.consent_type === "reset") acc.reset++;
      if (log.preferences) acc.withPreferences++;
      if (log.analytics) acc.withAnalytics++;
      if (log.marketing) acc.withMarketing++;
      return acc;
    },
    { total: 0, acceptAll: 0, acceptEssential: 0, custom: 0, reset: 0, withPreferences: 0, withAnalytics: 0, withMarketing: 0 }
  ) || { total: 0, acceptAll: 0, acceptEssential: 0, custom: 0, reset: 0, withPreferences: 0, withAnalytics: 0, withMarketing: 0 };

  // Group logs by session_id for unique visitor count
  const uniqueSessions = new Set(logs?.map(log => log.session_id).filter(Boolean) || []);

  // Calculate average time and pages
  const avgMetrics = useMemo(() => {
    if (!logs?.length) return { avgTime: 0, avgPages: 0, totalTime: 0, totalPages: 0 };
    const validTimeLogs = logs.filter(l => l.time_on_site_seconds && l.time_on_site_seconds > 0);
    const validPageLogs = logs.filter(l => l.pages_visited && l.pages_visited > 0);
    const totalTime = validTimeLogs.reduce((acc, l) => acc + (l.time_on_site_seconds || 0), 0);
    const totalPages = validPageLogs.reduce((acc, l) => acc + (l.pages_visited || 0), 0);
    return {
      avgTime: validTimeLogs.length ? Math.round(totalTime / validTimeLogs.length) : 0,
      avgPages: validPageLogs.length ? (totalPages / validPageLogs.length).toFixed(1) : "0",
      totalTime,
      totalPages,
    };
  }, [logs]);

  // Country distribution for pie chart
  const countryData = useMemo(() => {
    if (!logs?.length) return [];
    const countryCount: Record<string, number> = {};
    logs.forEach(log => {
      const country = log.country || "Desconhecido";
      countryCount[country] = (countryCount[country] || 0) + 1;
    });
    return Object.entries(countryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [logs]);

  // Device distribution for pie chart
  const deviceData = useMemo(() => {
    if (!logs?.length) return [];
    const deviceCount: Record<string, number> = {};
    logs.forEach(log => {
      const device = log.device_type || "desktop";
      deviceCount[device] = (deviceCount[device] || 0) + 1;
    });
    return Object.entries(deviceCount)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [logs]);

  // Consent trend over time for line chart
  const trendData = useMemo(() => {
    if (!logs?.length) return [];
    const days = parseInt(dateRange);
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });
    
    return interval.map(day => {
      const dayStart = startOfDay(day);
      const dayLogs = logs.filter(log => {
        const logDate = startOfDay(new Date(log.created_at));
        return logDate.getTime() === dayStart.getTime();
      });
      
      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        total: dayLogs.length,
        aceitos: dayLogs.filter(l => l.consent_type === "accept_all").length,
        essenciais: dayLogs.filter(l => l.consent_type === "accept_essential").length,
      };
    });
  }, [logs, dateRange]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.session_id?.toLowerCase().includes(search) ||
      log.user_id?.toLowerCase().includes(search) ||
      log.user_email?.toLowerCase().includes(search) ||
      log.user_name?.toLowerCase().includes(search) ||
      log.country?.toLowerCase().includes(search) ||
      log.browser_name?.toLowerCase().includes(search) ||
      log.page_url?.toLowerCase().includes(search)
    );
  });

  const getConsentTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      accept_all: { label: "Aceitou Tudo", variant: "default" },
      accept_essential: { label: "Apenas Essenciais", variant: "secondary" },
      custom: { label: "Personalizado", variant: "outline" },
      reset: { label: "Redefiniu", variant: "destructive" },
    };
    const config = variants[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const ConsentIcon = ({ enabled }: { enabled: boolean }) => (
    enabled ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground/50" />
  );

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "mobile" || deviceType === "tablet") {
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    }
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const copySessionId = (sessionId: string) => {
    navigator.clipboard.writeText(sessionId);
    toast({
      title: "ID copiado",
      description: "ID da sessão copiado para a área de transferência.",
    });
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportToCSV = () => {
    if (!filteredLogs?.length) return;

    const headers = [
      "Data", "Tipo", "Usuário", "E-mail", "País", "Dispositivo", "Navegador", "SO",
      "Páginas", "Tempo", "Necessários", "Preferências", "Análise", "Marketing", "Página", "Referência"
    ];
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm"),
      log.consent_type,
      log.user_name || "-",
      log.user_email || "-",
      log.country || "-",
      log.device_type || "-",
      `${log.browser_name || "-"} ${log.browser_version || ""}`.trim(),
      log.os_name || "-",
      log.pages_visited || 0,
      log.time_on_site_seconds || 0,
      log.essential ? "Sim" : "Não",
      log.preferences ? "Sim" : "Não",
      log.analytics ? "Sim" : "Não",
      log.marketing ? "Sim" : "Não",
      log.page_url || "",
      log.referrer_url || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cookie-consent-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Auditoria de Cookies</CardTitle>
              <CardDescription>
                Logs de consentimento de cookies para conformidade com a LGPD
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Fingerprint className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueSessions.size}</p>
                <p className="text-xs text-muted-foreground">Visitantes únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.acceptAll}</p>
                <p className="text-xs text-muted-foreground">Aceitaram tudo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.acceptEssential}</p>
                <p className="text-xs text-muted-foreground">Apenas essenciais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.withAnalytics / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Aceitam análise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Timer className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Tempo médio no site</p>
                <p className="text-3xl font-bold">{formatTime(avgMetrics.avgTime)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatTime(avgMetrics.totalTime)} em {logs?.length || 0} sessões
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-500/10">
                <FileText className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Páginas visitadas (média)</p>
                <p className="text-3xl font-bold">{avgMetrics.avgPages}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {avgMetrics.totalPages} páginas visitadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Consent Trend Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência de Consentimentos</CardTitle>
            <CardDescription>Evolução diária dos tipos de consentimento</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aceitos" 
                    name="Aceitos" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="essenciais" 
                    name="Apenas essenciais" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-4))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Dispositivo</CardTitle>
            <CardDescription>Distribuição por tipo de dispositivo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : deviceData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {deviceData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Country Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Distribuição por País
          </CardTitle>
          <CardDescription>Principais países de origem dos visitantes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[100px] w-full" />
          ) : countryData.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {countryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.value} visitante{entry.value > 1 ? "s" : ""} ({stats.total > 0 ? Math.round((entry.value / stats.total) * 100) : 0}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              Sem dados de localização disponíveis
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por sessão, usuário ou página..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="accept_all">Aceitou tudo</SelectItem>
                  <SelectItem value="accept_essential">Apenas essenciais</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="reset">Redefiniu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último dia</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={!filteredLogs?.length}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <LGPDReportExporter />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Sessão</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Cookies</TableHead>
                    <TableHead>Navegação</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.session_id ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => copySessionId(log.session_id!)}
                                  className="flex items-center gap-1.5 text-xs font-mono bg-muted/50 px-2 py-1 rounded hover:bg-muted transition-colors"
                                >
                                  <Fingerprint className="h-3 w-3 text-primary" />
                                  {log.session_id.substring(0, 8)}...
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{log.session_id}</p>
                                <p className="text-muted-foreground text-[10px]">Clique para copiar</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.user_name || log.user_email ? (
                          <div className="flex flex-col">
                            {log.user_name && (
                              <span className="text-sm font-medium">{log.user_name}</span>
                            )}
                            {log.user_email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {log.user_email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Anônimo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.country ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{log.country}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {getDeviceIcon(log.device_type)}
                            <span className="text-xs capitalize">{log.device_type || "desktop"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {log.browser_name} • {log.os_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getConsentTypeBadge(log.consent_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ConsentIcon enabled={log.essential} />
                          <ConsentIcon enabled={log.preferences} />
                          <ConsentIcon enabled={log.analytics} />
                          <ConsentIcon enabled={log.marketing} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            {log.pages_visited || 1} pág.
                          </span>
                          <span className="text-muted-foreground">
                            {formatTime(log.time_on_site_seconds)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.session_id && (
                          <AlertDialog open={sessionToDelete === log.session_id} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setSessionToDelete(log.session_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar dados de visitação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá <strong>todos os registros</strong> de consentimento desta sessão de forma permanente.
                                  <br /><br />
                                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    ID: {log.session_id}
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteSessionMutation.mutate(log.session_id!)}
                                  disabled={deleteSessionMutation.isPending}
                                >
                                  {deleteSessionMutation.isPending ? "Deletando..." : "Deletar dados"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Cookie className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum registro de consentimento encontrado.</p>
              <p className="text-sm mt-1">
                Os logs serão exibidos aqui quando os usuários interagirem com o banner de cookies.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Cookie Purge */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam os dados de auditoria LGPD.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Limpar Todos os Registros de Consentimento</p>
                <p className="text-sm text-muted-foreground">
                  Exclui permanentemente todos os {stats.total} registros de consentimento de cookies do banco de dados.
                  Esta ação requer verificação por e-mail.
                </p>
              </div>
              <CookiePurgeDialog />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}