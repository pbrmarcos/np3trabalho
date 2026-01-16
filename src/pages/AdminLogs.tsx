import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Search, 
  Download, 
  Filter,
  User,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Criação", color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  update: { label: "Atualização", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  delete: { label: "Exclusão", color: "bg-red-500/20 text-red-700 dark:text-red-400" },
  status_change: { label: "Status", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
  approve: { label: "Aprovação", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  reject: { label: "Rejeição", color: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
  upload: { label: "Upload", color: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
  download: { label: "Download", color: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400" },
  send: { label: "Envio", color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  project: "Projeto",
  ticket: "Ticket",
  design_order: "Pedido Design",
  file: "Arquivo",
  credential: "Credencial",
  blog_post: "Blog",
  page: "Página",
  settings: "Configurações",
  email: "Email",
  client: "Cliente",
  help_article: "Artigo Ajuda",
};

const ITEMS_PER_PAGE = 20;

export default function AdminLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage] = useState(1);
  
  const debouncedSearch = useDebounce(search, 300);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['action-logs', debouncedSearch, actionFilter, entityFilter, page],
    queryFn: async () => {
      // Use type assertion since action_logs table is newly created
      let query = (supabase
        .from('action_logs' as 'profiles') as unknown as ReturnType<typeof supabase.from>)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (actionFilter !== "all") {
        query = query.eq('action_type', actionFilter);
      }
      
      if (entityFilter !== "all") {
        query = query.eq('entity_type', entityFilter);
      }

      if (debouncedSearch) {
        query = query.or(`description.ilike.%${debouncedSearch}%,entity_name.ilike.%${debouncedSearch}%,user_email.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { logs: data || [], total: count || 0 };
    },
  });

  const logs = logsData?.logs || [];
  const totalPages = Math.ceil((logsData?.total || 0) / ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    if (!logs.length) return;
    
    const headers = ['Data', 'Usuário', 'Ação', 'Entidade', 'Nome', 'Descrição'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.user_email,
      ACTION_TYPE_LABELS[log.action_type]?.label || log.action_type,
      ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type,
      log.entity_name || '-',
      log.description,
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Logs de Auditoria" },
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
            <p className="text-muted-foreground">
              Histórico de todas as ações realizadas no sistema
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} disabled={!logs.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logsData?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total de Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, nome ou usuário..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Ações</SelectItem>
                  {Object.entries(ACTION_TYPE_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <FileText className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Entidades</SelectItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const actionInfo = ACTION_TYPE_LABELS[log.action_type] || { label: log.action_type, color: "bg-gray-500/20" };
                  
                  return (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{log.user_email}</span>
                          <Badge variant="secondary" className={actionInfo.color}>
                            {actionInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.description}
                          {log.entity_name && (
                            <span className="font-medium text-foreground"> • {log.entity_name}</span>
                          )}
                        </p>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages} ({logsData?.total} registros)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayoutWithSidebar>
  );
}
