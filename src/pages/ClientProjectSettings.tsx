import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, CheckCircle, AlertTriangle, Clock, Settings, Copy, Server, Eye, EyeOff, ShieldAlert, ExternalLink, LogIn } from "lucide-react";
import { usePlans, getPlanByProjectPlan } from "@/hooks/usePlans";
import ClientLayout from "@/components/ClientLayout";
import { toast } from "sonner";
import { decryptBatch } from "@/lib/crypto";

const statusConfig = {
  online: { icon: CheckCircle, label: "Online", color: "text-green-500", bgColor: "bg-green-500/10" },
  maintenance: { icon: AlertTriangle, label: "Manutenção", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  development: { icon: Clock, label: "Em Desenvolvimento", color: "text-blue-500", bgColor: "bg-blue-500/10" },
};

const domainStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  needs_registration: { label: "Precisa registrar domínio", color: "text-muted-foreground", bgColor: "bg-muted" },
  pending_dns: { label: "Aguardando apontamento DNS", color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  pointed: { label: "Domínio apontado para WebQ", color: "text-green-600", bgColor: "bg-green-500/10" },
  active: { label: "Domínio ativo e funcionando", color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
};

export default function ClientProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: plans } = usePlans();
  const [showServerIp, setShowServerIp] = useState(false);
  const [showCpanelUrl, setShowCpanelUrl] = useState(false);
  const [showCpanelLogin, setShowCpanelLogin] = useState(false);
  const [showCpanelPassword, setShowCpanelPassword] = useState(false);
  const [showSiteAccessUrl, setShowSiteAccessUrl] = useState(false);
  const [showSiteAccessLogin, setShowSiteAccessLogin] = useState(false);
  const [showSiteAccessPassword, setShowSiteAccessPassword] = useState(false);
  
  // Decrypted passwords state
  const [decryptedCpanelPassword, setDecryptedCpanelPassword] = useState<string | null>(null);
  const [decryptedSiteAccessPassword, setDecryptedSiteAccessPassword] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  
  // Decrypt passwords when project data loads
  useEffect(() => {
    const decryptPasswords = async () => {
      if (project) {
        try {
          const decrypted = await decryptBatch({
            cpanel_password: project.cpanel_password,
            site_access_password: project.site_access_password,
          });
          setDecryptedCpanelPassword(decrypted.cpanel_password);
          setDecryptedSiteAccessPassword(decrypted.site_access_password);
        } catch (err) {
          console.error('Failed to decrypt passwords:', err);
          setDecryptedCpanelPassword(project.cpanel_password);
          setDecryptedSiteAccessPassword(project.site_access_password);
        }
      }
    };
    decryptPasswords();
  }, [project]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const breadcrumbs = project
    ? [
        { label: "Dashboard", href: "/cliente/dashboard" },
        { label: project.name, href: `/cliente/projeto/${projectId}` },
        { label: "Configurações" },
      ]
    : [
        { label: "Dashboard", href: "/cliente/dashboard" },
        { label: "Configurações" },
      ];

  if (isLoading) {
    return (
      <ClientLayout
        title="Configurações"
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </ClientLayout>
    );
  }

  if (!project) {
    return (
      <ClientLayout
        title="Configurações"
        breadcrumbs={breadcrumbs}
      >
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Projeto não encontrado.</p>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.development;
  const StatusIcon = status.icon;
  const planInfo = getPlanByProjectPlan(plans, project.plan);
  const domainStatusInfo = domainStatusConfig[project.domain_status || "needs_registration"];

  return (
    <ClientLayout
      title="Configurações"
      subtitle={project.name}
      breadcrumbs={breadcrumbs}
    >
      {/* Bloco descritivo */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Configurações do Projeto
        </h3>
        <p className="text-sm text-muted-foreground">
          Visualize as <strong className="text-foreground">informações gerais</strong> do seu projeto, 
          incluindo plano contratado, domínio configurado e status atual. Para solicitar alterações, 
          utilize a seção de <strong className="text-foreground">Tickets</strong>.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Project Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Informações do Projeto
            </CardTitle>
            <CardDescription>
              Dados gerais do seu projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Nome do Projeto</p>
                <p className="font-medium text-foreground">{project.name}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Plano</p>
                <p className="font-medium text-foreground">{planInfo?.name || project.plan || "Básico"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Domínio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status do Domínio */}
            <div className={`p-4 rounded-lg ${domainStatusInfo.bgColor}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${domainStatusInfo.color}`}>
                  {domainStatusInfo.label}
                </span>
              </div>
            </div>

            {/* Domínio configurado */}
            {project.domain && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Endereço do Site</p>
                    <p className="font-medium text-foreground">{project.domain}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer">
                      Visitar
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* DNS Records - mostrar se estiver pendente ou apontado */}
            {(project.domain_status === "pending_dns" || project.domain_status === "pointed") && 
             (project.dns_record_1 || project.dns_record_2) && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Registros DNS para configurar</p>
                {project.dns_record_1 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border border-border">
                    <code className="text-sm font-mono">{project.dns_record_1}</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(project.dns_record_1!, "DNS 1")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {project.dns_record_2 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border border-border">
                    <code className="text-sm font-mono">{project.dns_record_2}</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(project.dns_record_2!, "DNS 2")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Notas do Admin */}
            {project.domain_notes && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs font-medium text-yellow-600 mb-1">Observação da equipe WebQ</p>
                <p className="text-sm text-foreground">{project.domain_notes}</p>
              </div>
            )}

            {/* Mensagem padrão se não tem domínio */}
            {!project.domain && project.domain_status === "needs_registration" && (
              <div className="text-center py-2">
                <p className="text-muted-foreground text-sm">
                  A equipe WebQ entrará em contato para configurar seu domínio
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hospedagem - mostrar apenas se houver informações */}
        {(project.server_ip || project.cpanel_url || project.cpanel_login) && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Dados de Hospedagem
              </CardTitle>
              <CardDescription>
                Informações de acesso ao servidor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso de segurança */}
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Atenção: Informações Confidenciais</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      Mantenha esses acessos em local seguro e não compartilhe com terceiros. 
                      Em caso de dúvidas ou solicitações, entre em contato conosco pelo e-mail{" "}
                      <a href="mailto:suporte@webq.com.br" className="font-medium underline">suporte@webq.com.br</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* IP do Servidor */}
              {project.server_ip && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">IP do Servidor</p>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-foreground">
                      {showServerIp ? project.server_ip : "•••.•••.•••.•"}
                    </code>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowServerIp(!showServerIp)}
                      >
                        {showServerIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(project.server_ip!, "IP")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* cPanel URL */}
              {project.cpanel_url && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">URL do cPanel</p>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-foreground truncate max-w-[200px]">
                      {showCpanelUrl ? project.cpanel_url : "••••••••••••••••"}
                    </code>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowCpanelUrl(!showCpanelUrl)}
                      >
                        {showCpanelUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(project.cpanel_url!, "URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Login e Senha */}
              {(project.cpanel_login || project.cpanel_password) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.cpanel_login && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Login</p>
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-foreground">
                          {showCpanelLogin ? project.cpanel_login : "••••••••"}
                        </code>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowCpanelLogin(!showCpanelLogin)}
                          >
                            {showCpanelLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(project.cpanel_login!, "Login")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {decryptedCpanelPassword && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Senha</p>
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-foreground">
                          {showCpanelPassword ? decryptedCpanelPassword : "••••••••"}
                        </code>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowCpanelPassword(!showCpanelPassword)}
                          >
                            {showCpanelPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(decryptedCpanelPassword!, "Senha")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Site Access Credentials - Highlighted */}
        {(project.site_access_url || project.site_access_login) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <LogIn className="h-5 w-5" />
                Acesso ao Seu Site
              </CardTitle>
              <CardDescription>
                Use estes dados para acessar o painel administrativo do seu site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso de segurança */}
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Atenção: Informações Confidenciais</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      Mantenha esses acessos em local seguro e não compartilhe com terceiros. 
                      Em caso de dúvidas ou solicitações, entre em contato conosco pelo e-mail{" "}
                      <a href="mailto:suporte@webq.com.br" className="font-medium underline">suporte@webq.com.br</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* URL de Acesso */}
              {project.site_access_url && (
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">URL de Acesso</p>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-foreground truncate max-w-[200px]">
                      {showSiteAccessUrl ? project.site_access_url : "••••••••••••••••"}
                    </code>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowSiteAccessUrl(!showSiteAccessUrl)}
                      >
                        {showSiteAccessUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(project.site_access_url!, "URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {showSiteAccessUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a href={project.site_access_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Login e Senha */}
              {(project.site_access_login || decryptedSiteAccessPassword) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.site_access_login && (
                    <div className="p-4 bg-background rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-foreground">
                          {showSiteAccessLogin ? project.site_access_login : "••••••••"}
                        </code>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowSiteAccessLogin(!showSiteAccessLogin)}
                          >
                            {showSiteAccessLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(project.site_access_login!, "Usuário")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {decryptedSiteAccessPassword && (
                    <div className="p-4 bg-background rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Senha</p>
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-foreground">
                          {showSiteAccessPassword ? decryptedSiteAccessPassword : "••••••••"}
                        </code>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowSiteAccessPassword(!showSiteAccessPassword)}
                          >
                            {showSiteAccessPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(decryptedSiteAccessPassword!, "Senha")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${status.color}`} />
              Status do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${status.bgColor}`}>
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-6 w-6 ${status.color}`} />
                <div>
                  <p className={`font-medium ${status.color}`}>{status.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.status === "online" && "Seu site está no ar e funcionando normalmente."}
                    {project.status === "maintenance" && "Seu site está em manutenção temporária."}
                    {project.status === "development" && "Seu site está sendo desenvolvido pela equipe."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {project.notes && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}