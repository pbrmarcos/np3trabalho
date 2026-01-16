import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, FolderOpen, MessageSquare, HelpCircle, Pencil, PenTool, CreditCard, Settings, Zap, Receipt } from "lucide-react";

interface ClientQuickActionsProps {
  projectId?: string;
}

export default function ClientQuickActions({ projectId }: ClientQuickActionsProps) {
  const actions = [
    {
      label: "Emails",
      icon: Mail,
      href: projectId ? `/cliente/projeto/${projectId}/emails` : null,
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      label: "Arquivos",
      icon: FolderOpen,
      href: projectId ? `/cliente/projeto/${projectId}/arquivos` : null,
      color: "text-cyan-500 bg-cyan-500/10",
    },
    {
      label: "Tickets",
      icon: MessageSquare,
      href: projectId ? `/cliente/projeto/${projectId}/tickets` : null,
      color: "text-yellow-500 bg-yellow-500/10",
    },
    {
      label: "Design",
      icon: PenTool,
      href: "/cliente/design",
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      label: "Assinatura",
      icon: CreditCard,
      href: "/cliente/assinatura",
      color: "text-green-500 bg-green-500/10",
    },
    {
      label: "Pagamentos",
      icon: Receipt,
      href: "/cliente/pagamentos",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Configurações",
      icon: Settings,
      href: projectId ? `/cliente/projeto/${projectId}/configuracoes` : null,
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      label: "Ajuda",
      icon: HelpCircle,
      href: "/ajuda",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Dados",
      icon: Pencil,
      href: "/cliente/projeto/editar",
      color: "text-muted-foreground bg-muted",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Atalhos Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            if (!action.href) return null;
            
            const Icon = action.icon;
            
            return (
              <Link key={action.label} to={action.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 hover:bg-muted"
                >
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${action.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm truncate">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
