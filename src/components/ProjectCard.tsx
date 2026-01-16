import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Mail, FileUp, Settings, CheckCircle, AlertTriangle, Clock, CreditCard, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { usePlans, getPlanByProjectPlan } from "@/hooks/usePlans";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  domain: string | null;
  status: "online" | "maintenance" | "development";
  plan: string | null;
}

interface ProjectCardProps {
  project: Project;
}

const statusConfig = {
  online: { icon: CheckCircle, label: "Online", color: "text-green-500" },
  maintenance: { icon: AlertTriangle, label: "Manutenção", color: "text-yellow-500" },
  development: { icon: Clock, label: "Em Desenvolvimento", color: "text-blue-500" },
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const { data: plans } = usePlans();
  const StatusIcon = statusConfig[project.status]?.icon || Clock;
  const statusInfo = statusConfig[project.status] || statusConfig.development;
  
  const planInfo = getPlanByProjectPlan(plans, project.plan);

  const handleViewSite = () => {
    if (project.domain) {
      window.open(`https://${project.domain}`, "_blank");
    } else {
      toast.info("Domínio ainda não configurado para este projeto.");
    }
  };

  const actions = [
    { icon: Globe, label: "Ver Site", description: "Acessar site publicado", onClick: handleViewSite },
    { icon: Mail, label: "Emails", description: "Gerenciar contas", onClick: () => navigate(`/cliente/projeto/${project.id}/emails`) },
    { icon: FileUp, label: "Arquivos", description: "Ver arquivos", onClick: () => navigate(`/cliente/projeto/${project.id}/arquivos`) },
    { icon: MessageSquare, label: "Tickets", description: "Solicitações", onClick: () => navigate(`/cliente/projeto/${project.id}/tickets`) },
    { icon: CreditCard, label: "Pagamento", description: "Ver assinatura", onClick: () => navigate("/cliente/assinatura") },
    { icon: Settings, label: "Configurações", description: "Ver detalhes", onClick: () => navigate(`/cliente/projeto/${project.id}/configuracoes`) },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-foreground text-base md:text-lg">{project.name}</CardTitle>
            <CardDescription className="text-sm flex items-center gap-1">
              {project.domain || "Domínio não configurado"}
              {project.domain && (
                <ExternalLink className="h-3 w-3 cursor-pointer hover:text-primary" onClick={handleViewSite} />
              )}
            </CardDescription>
          </div>
          <div className={`flex items-center gap-2 ${statusInfo.color}`}>
            <StatusIcon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-medium text-sm md:text-base">{statusInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs md:text-sm text-muted-foreground pt-2">
          <span>Plano: <span className="text-foreground font-medium">{planInfo?.name || project.plan || "Basic"}</span></span>
          {planInfo && (
            <span className="text-primary font-medium">R$ {planInfo.price}/mês</span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 pt-0">
        <p className="text-xs text-muted-foreground mb-3">Ações Rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="group flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="text-xs md:text-sm font-medium text-foreground block">
                  {action.label}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
