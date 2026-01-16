import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, ExternalLink, Copy, CheckCircle2, Info, AlertCircle, Clock, Globe, Shield, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface UptimeRobotConfigFormProps {
  settings?: Record<string, { id: string; value: any; description: string }>;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function UptimeRobotConfigForm({ settings, onSave, isSaving }: UptimeRobotConfigFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [statusPageUrl, setStatusPageUrl] = useState("");
  const [monitorId, setMonitorId] = useState("");

  useEffect(() => {
    if (settings?.uptimerobot_config?.value) {
      const config = settings.uptimerobot_config.value;
      setApiKey(config.api_key || "");
      setStatusPageUrl(config.status_page_url || "");
      setMonitorId(config.monitor_id || "");
    }
  }, [settings]);

  const handleSave = () => {
    onSave("uptimerobot_config", {
      api_key: apiKey,
      status_page_url: statusPageUrl,
      monitor_id: monitorId,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const tutorialSteps = [
    {
      step: 1,
      title: "Criar conta no UptimeRobot",
      description: "Acesse uptimerobot.com e crie uma conta gratuita. O plano free permite monitorar até 50 monitores.",
      link: "https://uptimerobot.com/signUp",
    },
    {
      step: 2,
      title: "Adicionar Monitor",
      description: "Clique em 'Add New Monitor', selecione 'HTTP(s)' como tipo, insira a URL do seu site e configure o intervalo de verificação (5 min no plano free).",
    },
    {
      step: 3,
      title: "Obter API Key",
      description: "Vá em 'My Settings' → 'API Settings' e copie sua 'Main API Key' ou crie uma 'Monitor-Specific API Key' para maior segurança.",
    },
    {
      step: 4,
      title: "Criar Status Page (Opcional)",
      description: "Em 'Status Pages', crie uma página pública para exibir o status do seu site aos clientes.",
    },
    {
      step: 5,
      title: "Configurar Alertas",
      description: "Configure alertas por email, SMS, Telegram ou Slack para ser notificado quando o site ficar offline.",
    },
  ];

  const features = [
    { icon: Clock, title: "Monitoramento 24/7", description: "Verificações a cada 5 minutos" },
    { icon: Globe, title: "Múltiplas Localizações", description: "Monitoramento de várias regiões" },
    { icon: Shield, title: "SSL Monitoring", description: "Alertas de expiração de certificado" },
    { icon: BarChart3, title: "Relatórios", description: "Histórico de uptime e latência" },
  ];

  return (
    <div className="space-y-6">
      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Por que usar o UptimeRobot?
          </CardTitle>
          <CardDescription>
            Monitoramento gratuito e profissional para garantir que seus sites estejam sempre online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-primary/10">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tutorial Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Tutorial de Configuração
          </CardTitle>
          <CardDescription>
            Siga estes passos para configurar o monitoramento do seu site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tutorialSteps.map((item, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{item.step}</span>
              </div>
              <div className="flex-1 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{item.title}</h4>
                  {item.link && (
                    <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dica:</strong> O plano gratuito do UptimeRobot é suficiente para a maioria dos casos. 
              Você pode monitorar até 50 sites com verificações a cada 5 minutos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Configuração
          </CardTitle>
          <CardDescription>
            Salve as informações do UptimeRobot para referência (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="ur-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
              {apiKey && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre em: My Settings → API Settings
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitor-id">Monitor ID</Label>
            <Input
              id="monitor-id"
              placeholder="123456789"
              value={monitorId}
              onChange={(e) => setMonitorId(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              ID do monitor principal do seu site (visível na URL do dashboard)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-page">URL da Status Page</Label>
            <div className="flex gap-2">
              <Input
                id="status-page"
                type="url"
                placeholder="https://stats.uptimerobot.com/xxxxxx"
                value={statusPageUrl}
                onChange={(e) => setStatusPageUrl(e.target.value)}
                className="font-mono text-sm"
              />
              {statusPageUrl && (
                <Button variant="outline" size="icon" asChild>
                  <a href={statusPageUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Página pública para exibir o status do seu site
            </p>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <Button variant="ghost" asChild>
              <a 
                href="https://uptimerobot.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Dashboard UptimeRobot
              </a>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Monitors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monitores Recomendados</CardTitle>
          <CardDescription>
            Configure estes monitores para cobertura completa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Site Principal</p>
                <p className="text-xs text-muted-foreground">HTTP(s) - Sua homepage</p>
              </div>
              <Badge variant="outline">Essencial</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">API/Edge Functions</p>
                <p className="text-xs text-muted-foreground">Keyword - Endpoint de health check</p>
              </div>
              <Badge variant="outline">Recomendado</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Certificado SSL</p>
                <p className="text-xs text-muted-foreground">Port 443 - Verificação de SSL</p>
              </div>
              <Badge variant="outline">Opcional</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
