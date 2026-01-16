import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ActionLogTimelineProps {
  entityType: string;
  entityId: string;
  limit?: number;
}

export default function ActionLogTimeline({ entityType, entityId, limit = 10 }: ActionLogTimelineProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['action-logs-timeline', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma ação registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => {
        const actionInfo = ACTION_TYPE_LABELS[log.action_type] || { label: log.action_type, color: "bg-gray-500/20" };
        
        return (
          <div key={log.id} className="flex gap-3">
            <div className="relative">
              <div className="p-1.5 rounded-full bg-muted">
                <User className="h-3 w-3" />
              </div>
              {index < logs.length - 1 && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${actionInfo.color}`}>
                  {actionInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  por {log.user_email}
                </span>
              </div>
              
              <p className="text-sm mt-1">{log.description}</p>
              
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
