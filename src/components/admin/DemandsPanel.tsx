import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, Loader2, CheckCircle2, Users } from "lucide-react";
import { useAdminDemands, Demand } from "@/hooks/useAdminDemands";
import { DemandCard } from "./DemandCard";

export function DemandsPanel() {
  const { demands, overdue, urgent, normal, isLoading } = useAdminDemands();
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Extract unique clients
  const clients = useMemo(() => {
    const uniqueClients = new Map<string, string>();
    demands.forEach(d => {
      if (d.clientName && !uniqueClients.has(d.clientName)) {
        uniqueClients.set(d.clientName, d.clientName);
      }
    });
    return Array.from(uniqueClients.values()).sort();
  }, [demands]);

  // Filter demands by client first
  const clientFilteredDemands = useMemo(() => {
    if (selectedClient === "all") return demands;
    return demands.filter(d => d.clientName === selectedClient);
  }, [demands, selectedClient]);

  const filterDemands = (filter: string): Demand[] => {
    const now = new Date();
    
    switch (filter) {
      case 'overdue':
        return clientFilteredDemands.filter(d => d.deadline.getTime() < now.getTime());
      case 'urgent':
        return clientFilteredDemands.filter(d => {
          const remaining = d.deadline.getTime() - now.getTime();
          const totalTime = d.estimatedDays * 24 * 60 * 60 * 1000;
          return remaining >= 0 && remaining < totalTime * 0.25;
        });
      case 'design':
        return clientFilteredDemands.filter(d => d.type === 'design_revision' || d.type === 'design_new');
      case 'tickets':
        return clientFilteredDemands.filter(d => d.type === 'ticket');
      case 'migrations':
        return clientFilteredDemands.filter(d => d.type === 'migration');
      default:
        return clientFilteredDemands;
    }
  };

  // Recalculate counts based on client filter
  const filteredOverdue = useMemo(() => {
    const now = new Date();
    return clientFilteredDemands.filter(d => d.deadline.getTime() < now.getTime()).length;
  }, [clientFilteredDemands]);

  const filteredUrgent = useMemo(() => {
    const now = new Date();
    return clientFilteredDemands.filter(d => {
      const remaining = d.deadline.getTime() - now.getTime();
      const totalTime = d.estimatedDays * 24 * 60 * 60 * 1000;
      return remaining >= 0 && remaining < totalTime * 0.25;
    }).length;
  }, [clientFilteredDemands]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (demands.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-foreground font-medium">Nenhuma demanda pendente</p>
          <p className="text-sm text-muted-foreground">Todas as tarefas foram concluídas!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Central de Demandas
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Filter */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {filteredOverdue > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {filteredOverdue} atrasado{filteredOverdue > 1 ? 's' : ''}
              </Badge>
            )}
            {filteredUrgent > 0 && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1">
                <Clock className="h-3 w-3" />
                {filteredUrgent} urgente{filteredUrgent > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">
              {clientFilteredDemands.length} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs">
              Todos ({clientFilteredDemands.length})
            </TabsTrigger>
            {filteredOverdue > 0 && (
              <TabsTrigger value="overdue" className="text-xs text-red-600 dark:text-red-400">
                Atrasados ({filteredOverdue})
              </TabsTrigger>
            )}
            {filteredUrgent > 0 && (
              <TabsTrigger value="urgent" className="text-xs text-amber-600 dark:text-amber-400">
                Urgentes ({filteredUrgent})
              </TabsTrigger>
            )}
            <TabsTrigger value="design" className="text-xs">
              Design ({filterDemands('design').length})
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">
              Tickets ({filterDemands('tickets').length})
            </TabsTrigger>
            <TabsTrigger value="migrations" className="text-xs">
              Migrações ({filterDemands('migrations').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'overdue', 'urgent', 'design', 'tickets', 'migrations'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filterDemands(tab).map(demand => (
                  <DemandCard key={`${demand.type}-${demand.id}`} demand={demand} />
                ))}
                {filterDemands(tab).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma demanda nesta categoria.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
