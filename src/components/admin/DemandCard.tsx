import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Palette, Ticket, Clock, AlertTriangle, ArrowRight, RefreshCw, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Demand } from "@/hooks/useAdminDemands";

interface DemandCardProps {
  demand: Demand;
}

export function DemandCard({ demand }: DemandCardProps) {
  const navigate = useNavigate();
  const now = new Date();
  const remaining = demand.deadline.getTime() - now.getTime();
  const totalTime = demand.estimatedDays * 24 * 60 * 60 * 1000;
  const progressPercent = Math.max(0, Math.min(100, ((totalTime - remaining) / totalTime) * 100));
  
  const isOverdue = remaining < 0;
  const isUrgent = remaining >= 0 && remaining < totalTime * 0.25;
  
  // Format remaining time
  const formatRemaining = () => {
    if (isOverdue) {
      const overdueMs = Math.abs(remaining);
      const days = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((overdueMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      if (days > 0) return `${days}d ${hours}h atrasado`;
      return `${hours}h atrasado`;
    }
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h restantes`;
    const minutes = Math.floor(remaining / (60 * 1000));
    return `${minutes}min restantes`;
  };

  const getIcon = () => {
    if (demand.type === 'ticket') return Ticket;
    if (demand.type === 'design_revision') return RefreshCw;
    if (demand.type === 'migration') return Globe;
    return Palette;
  };

  const getIconColor = () => {
    if (isOverdue) return "text-red-500";
    if (isUrgent) return "text-amber-500";
    if (demand.type === 'ticket') return "text-blue-500";
    if (demand.type === 'design_revision') return "text-orange-500";
    if (demand.type === 'migration') return "text-teal-500";
    return "text-purple-500";
  };

  const getIconBg = () => {
    if (isOverdue) return "bg-red-500/10";
    if (isUrgent) return "bg-amber-500/10";
    if (demand.type === 'ticket') return "bg-blue-500/10";
    if (demand.type === 'design_revision') return "bg-orange-500/10";
    if (demand.type === 'migration') return "bg-teal-500/10";
    return "bg-purple-500/10";
  };

  const getProgressColor = () => {
    if (isOverdue) return "bg-red-500";
    if (isUrgent) return "bg-amber-500";
    return "bg-primary";
  };

  const getBorderColor = () => {
    if (isOverdue) return "border-red-500/50 hover:border-red-500";
    if (isUrgent) return "border-amber-500/50 hover:border-amber-500";
    return "border-border hover:border-primary/50";
  };

  const getStatusBadge = () => {
    if (demand.type === 'design_revision') {
      return (
        <Badge className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400">
          Revisão solicitada
        </Badge>
      );
    }
    if (demand.type === 'design_new') {
      const statusLabels: Record<string, string> = {
        paid: 'Aguardando início',
        confirmed: 'Confirmado',
        in_progress: 'Em produção',
      };
      return (
        <Badge className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400">
          {statusLabels[demand.status] || demand.status}
        </Badge>
      );
    }
    if (demand.type === 'migration') {
      const statusLabels: Record<string, string> = {
        pending: 'Pendente',
        in_progress: 'Em andamento',
        analyzing: 'Em análise',
      };
      return (
        <Badge className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400">
          {statusLabels[demand.status] || demand.status}
        </Badge>
      );
    }
    // Ticket
    const priorityColors: Record<string, string> = {
      urgent: 'bg-red-500/10 text-red-600 dark:text-red-400',
      high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      low: 'bg-muted text-muted-foreground',
    };
    return (
      <Badge className={`text-xs ${priorityColors[demand.priority || 'medium']}`}>
        {demand.status === 'open' ? 'Aberto' : 'Em andamento'}
      </Badge>
    );
  };

  const handleClick = () => {
    if (demand.type === 'ticket' && demand.projectId) {
      navigate(`/admin/projects/${demand.projectId}?tab=tickets&ticket=${demand.id}`);
    } else if (demand.type === 'design_revision' || demand.type === 'design_new') {
      navigate(`/admin/design/${demand.id}`);
    } else if (demand.type === 'migration') {
      navigate('/admin/migrations');
    }
  };

  const Icon = getIcon();

  return (
    <Card 
      className={`group transition-all cursor-pointer ${getBorderColor()}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg ${getIconBg()} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${getIconColor()}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-medium text-foreground truncate">{demand.title}</h3>
              {getStatusBadge()}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Atrasado
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate mb-2">
              {demand.clientName}
              {demand.type === 'design_revision' && demand.revisionsUsed !== undefined && (
                <span className="ml-2">• Correção {demand.revisionsUsed}/{demand.maxRevisions}</span>
              )}
              {demand.type === 'migration' && demand.migrationSiteType && (
                <span className="ml-2">• {demand.migrationSiteType}</span>
              )}
            </p>

            {/* Timer and Progress */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className={isOverdue ? 'text-red-500 font-medium' : isUrgent ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
                  {formatRemaining()}
                </span>
              </div>
              
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                Prazo: {demand.deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}
