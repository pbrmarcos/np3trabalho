import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Globe, ExternalLink, Settings, Mail, FolderOpen, MessageSquare, Cloud, 
  Server, ChevronDown, ChevronUp, Copy, Eye, EyeOff, ShieldAlert, Send
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { decryptValue } from "@/lib/crypto";

interface Project {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string | null;
  cloud_drive_url?: string | null;
  server_ip?: string | null;
  cpanel_url?: string | null;
  cpanel_login?: string | null;
  cpanel_password?: string | null;
}

interface ClientProjectSummaryProps {
  project: Project;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" },
  development: { label: "Em Desenvolvimento", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  maintenance: { label: "Em Manutenção", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" },
};

export default function ClientProjectSummary({ project }: ClientProjectSummaryProps) {
  const status = statusConfig[project.status] || statusConfig.development;
  const [showHosting, setShowHosting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  
  const hasHostingInfo = project.server_ip || project.cpanel_url || project.cpanel_login;
  
  // Decrypt cpanel password
  useEffect(() => {
    const decrypt = async () => {
      if (project.cpanel_password) {
        try {
          const decrypted = await decryptValue(project.cpanel_password);
          setDecryptedPassword(decrypted);
        } catch {
          setDecryptedPassword(project.cpanel_password);
        }
      }
    };
    decrypt();
  }, [project.cpanel_password]);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Fetch unread message count and latest message for this project
  const { data: messageData } = useQuery({
    queryKey: ["project-messages-data", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_messages")
        .select("id, message, message_type, created_at, read_at, project_id")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const unreadCount = data?.filter(m => !m.read_at).length || 0;
      
      return { unreadCount };
    },
  });

  const unreadCount = messageData?.unreadCount || 0;

  return (
    <>
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Project Info */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-foreground">
                    {project.name}
                  </h3>
                  <Badge variant="outline" className={status.color}>
                    {status.label}
                  </Badge>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="bg-primary text-primary-foreground animate-pulse">
                      <Send className="h-3 w-3 mr-1" />
                      {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                    </Badge>
                  )}
                </div>
                {project.domain ? (
                  <a 
                    href={`https://${project.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {project.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Domínio a definir
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/cliente/projeto/${project.id}/emails`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Emails</span>
                </Button>
              </Link>
              <Link to={`/cliente/projeto/${project.id}/arquivos`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Arquivos</span>
                </Button>
              </Link>
              <Link to={`/cliente/projeto/${project.id}/tickets`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </Button>
              </Link>
              {project.cloud_drive_url && (
                <a href={project.cloud_drive_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Cloud className="h-4 w-4" />
                    <span className="hidden sm:inline">Drive</span>
                  </Button>
                </a>
              )}
              <Link to={`/cliente/projeto/${project.id}/configuracoes`}>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hosting Info - Collapsible */}
          {hasHostingInfo && (
            <Collapsible open={showHosting} onOpenChange={setShowHosting} className="mt-4 pt-4 border-t border-border">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span className="text-xs">Dados de Hospedagem</span>
                  </div>
                  {showHosting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Warning */}
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">
                      <strong>Atenção:</strong> Mantenha esses acessos em local seguro. Dúvidas? Contate{" "}
                      <a href="mailto:suporte@webq.com.br" className="underline font-medium">suporte@webq.com.br</a>
                    </p>
                  </div>
                </div>
                
                {/* Compact credentials grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {project.server_ip && (
                    <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground">IP:</span>{" "}
                        <code className="font-mono">{project.server_ip}</code>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(project.server_ip!, "IP")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {project.cpanel_url && (
                    <div className="p-2 bg-muted/50 rounded flex items-center justify-between col-span-2">
                      <div className="truncate">
                        <span className="text-muted-foreground">cPanel:</span>{" "}
                        <a href={project.cpanel_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                          {project.cpanel_url.replace(/^https?:\/\//, '').substring(0, 30)}...
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(project.cpanel_url!, "URL")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {project.cpanel_login && (
                    <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground">Login:</span>{" "}
                        <code className="font-mono">{project.cpanel_login}</code>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(project.cpanel_login!, "Login")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {(project.cpanel_password || decryptedPassword) && (
                    <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground">Senha:</span>{" "}
                        <code className="font-mono">{showPassword ? (decryptedPassword || project.cpanel_password) : "••••••"}</code>
                      </div>
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(decryptedPassword || project.cpanel_password!, "Senha")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </>
  );
}
