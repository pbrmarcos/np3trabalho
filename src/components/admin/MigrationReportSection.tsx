import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Clock, CheckCircle2, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MigrationStats {
  totalThisMonth: number;
  completedThisMonth: number;
  averageCompletionDays: number;
  pendingCount: number;
  inProgressCount: number;
  completionRate: number;
  byStatus: Record<string, number>;
  bySiteType: Record<string, number>;
  recentCompletions: Array<{
    domain: string;
    completedAt: string;
    daysToComplete: number;
  }>;
}

export default function MigrationReportSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["migration-report-stats"],
    queryFn: async (): Promise<MigrationStats> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch all migrations
      const { data: allMigrations, error } = await supabase
        .from("migration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const migrations = allMigrations || [];

      // This month's migrations
      const thisMonthMigrations = migrations.filter(m => {
        const createdAt = new Date(m.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      // Completed this month
      const completedThisMonth = thisMonthMigrations.filter(m => m.status === "completed").length;

      // Calculate average completion time (for completed migrations)
      const completedMigrations = migrations.filter(m => m.status === "completed");
      let totalDays = 0;
      const recentCompletions: MigrationStats["recentCompletions"] = [];

      completedMigrations.forEach(m => {
        const createdAt = new Date(m.created_at);
        const updatedAt = new Date(m.updated_at);
        const daysToComplete = differenceInDays(updatedAt, createdAt);
        totalDays += daysToComplete;

        if (recentCompletions.length < 5) {
          recentCompletions.push({
            domain: m.current_domain,
            completedAt: m.updated_at,
            daysToComplete
          });
        }
      });

      const averageCompletionDays = completedMigrations.length > 0 
        ? Math.round(totalDays / completedMigrations.length) 
        : 0;

      // Count by status
      const byStatus: Record<string, number> = {};
      migrations.forEach(m => {
        byStatus[m.status] = (byStatus[m.status] || 0) + 1;
      });

      // Count by site type
      const bySiteType: Record<string, number> = {};
      migrations.forEach(m => {
        bySiteType[m.site_type] = (bySiteType[m.site_type] || 0) + 1;
      });

      // Pending and in progress counts
      const pendingCount = migrations.filter(m => m.status === "pending").length;
      const inProgressCount = migrations.filter(m => 
        ["in_contact", "analyzing", "approved", "in_progress"].includes(m.status)
      ).length;

      // Completion rate
      const completionRate = migrations.length > 0 
        ? Math.round((completedMigrations.length / migrations.length) * 100) 
        : 0;

      return {
        totalThisMonth: thisMonthMigrations.length,
        completedThisMonth,
        averageCompletionDays,
        pendingCount,
        inProgressCount,
        completionRate,
        byStatus,
        bySiteType,
        recentCompletions
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    in_contact: "Em Contato",
    analyzing: "Analisando",
    approved: "Aprovado",
    in_progress: "Em Migração",
    completed: "Concluído",
    cancelled: "Cancelado"
  };

  const siteTypeLabels: Record<string, string> = {
    wordpress: "WordPress",
    wix: "Wix",
    html: "HTML/CSS",
    ecommerce: "E-commerce",
    outro: "Outro"
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Carregando relatório...
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Relatório de Migrações</h2>
        <Badge variant="outline" className="ml-2">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(), "MMMM yyyy", { locale: ptBR })}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Este Mês</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalThisMonth}</div>
            <div className="text-xs text-muted-foreground">novas solicitações</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Concluídas</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.completedThisMonth}</div>
            <div className="text-xs text-muted-foreground">este mês</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Tempo Médio</span>
            </div>
            <div className="text-2xl font-bold">{stats.averageCompletionDays}</div>
            <div className="text-xs text-muted-foreground">dias para conclusão</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Taxa de Sucesso</span>
            </div>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <div className="text-xs text-muted-foreground">migrações concluídas</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm">{statusLabels[status] || status}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Site Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Tipo de Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.bySiteType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{siteTypeLabels[type] || type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Completions */}
      {stats.recentCompletions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Últimas Conclusões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentCompletions.map((completion, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{completion.domain}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{completion.daysToComplete} dias</span>
                    <span>•</span>
                    <span>{format(new Date(completion.completedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status Atual</p>
              <p className="font-medium">
                <span className="text-yellow-600">{stats.pendingCount}</span> pendentes
                {" • "}
                <span className="text-blue-600">{stats.inProgressCount}</span> em andamento
              </p>
            </div>
            <Badge variant="outline" className="text-primary border-primary/30">
              Atualizado agora
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
