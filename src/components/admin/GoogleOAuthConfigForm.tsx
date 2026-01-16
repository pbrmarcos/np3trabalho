import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, Check, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { SUPABASE_PROJECT_ID } from "@/lib/constants";

const CALLBACK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1/callback`;

const AUTHORIZED_DOMAINS = [
  { label: "Produção", domain: "https://webq.com.br" },
  { label: "Produção (www)", domain: "https://www.webq.com.br" },
  { label: "Desenvolvimento", domain: "http://localhost:8080" },
];

export default function GoogleOAuthConfigForm() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openGoogleConsole = () => {
    window.open("https://console.cloud.google.com/apis/credentials", "_blank");
  };

  const openSupabaseAuth = () => {
    window.open(`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/auth/providers`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Integração</CardTitle>
          </div>
          <CardDescription>
            Configure o login com Google para seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm">
              A configuração do Google OAuth é feita no <strong>Google Cloud Console</strong> e no <strong>Supabase</strong>. 
              Após configurar nos dois lugares, o login com Google funcionará automaticamente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Domains Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">1. Domínios Autorizados</CardTitle>
          <CardDescription>
            Adicione estes domínios em "Authorized JavaScript origins" no Google Cloud Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUTHORIZED_DOMAINS.map((item) => (
            <div key={item.domain} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {item.label}
                </Badge>
                <code className="text-sm font-mono text-foreground">{item.domain}</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(item.domain, item.domain)}
              >
                {copiedField === item.domain ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Callback URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">2. URL de Callback</CardTitle>
          <CardDescription>
            Adicione esta URL em "Authorized redirect URIs" no Google Cloud Console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <code className="text-sm font-mono text-foreground break-all">{CALLBACK_URL}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CALLBACK_URL, "callback")}
            >
              {copiedField === "callback" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">3. Passo a Passo</CardTitle>
          <CardDescription>
            Siga estas instruções para configurar o Google OAuth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">Criar Projeto no Google Cloud</p>
                <p className="text-sm text-muted-foreground">
                  Acesse o Google Cloud Console e crie um novo projeto (ou selecione um existente)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">Configurar OAuth Consent Screen</p>
                <p className="text-sm text-muted-foreground">
                  Em "OAuth consent screen", configure o app com escopos: email, profile, openid
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Criar Credenciais OAuth 2.0</p>
                <p className="text-sm text-muted-foreground">
                  Em "Credentials" → "Create Credentials" → "OAuth client ID" (tipo: Web application)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium text-foreground">Adicionar Domínios e Callback</p>
                <p className="text-sm text-muted-foreground">
                  Cole os domínios autorizados e a URL de callback listados acima
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                5
              </div>
              <div>
                <p className="font-medium text-foreground">Copiar Client ID e Secret</p>
                <p className="text-sm text-muted-foreground">
                  Copie o Client ID e Client Secret gerados pelo Google
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                6
              </div>
              <div>
                <p className="font-medium text-foreground">Configurar no Supabase</p>
                <p className="text-sm text-muted-foreground">
                  Acesse Authentication → Providers → Google e insira o Client ID e Secret
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={openGoogleConsole} variant="outline" className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Google Cloud Console
            </Button>
            <Button onClick={openSupabaseAuth} variant="default" className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Configurar no Supabase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Alert className="bg-green-500/10 border-green-500/30">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-sm">
          <strong>Segurança:</strong> O login com Google está disponível apenas para clientes. 
          Administradores continuam usando email/senha para garantir maior segurança.
        </AlertDescription>
      </Alert>
    </div>
  );
}
