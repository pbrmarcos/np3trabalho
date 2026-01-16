import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Mail, ExternalLink, Globe, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface ValidationResult {
  valid: boolean;
  message: string;
  domains?: ResendDomain[];
}

interface EmailConfig {
  sender_email: string;
  sender_name: string;
  reply_to: string;
}

interface ResendConfigFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function ResendConfigForm({ settings, onSave, isSaving }: ResendConfigFormProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  const [formData, setFormData] = useState<EmailConfig>({
    sender_email: "noreply@webq.com.br",
    sender_name: "WebQ Sistema",
    reply_to: "suporte@webq.com.br"
  });

  // Sincronizar formData quando settings mudar
  useEffect(() => {
    const emailConfig: EmailConfig = settings?.email_config?.value || {
      sender_email: "noreply@webq.com.br",
      sender_name: "WebQ Sistema",
      reply_to: "suporte@webq.com.br"
    };
    setFormData(emailConfig);
  }, [settings]);

  const validateResendKey = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-resend-key');

      if (error) {
        setValidationResult({
          valid: false,
          message: `Erro ao chamar função: ${error.message}`,
        });
        toast.error("Erro ao validar conexão com Resend");
      } else {
        setValidationResult(data);
        if (data.valid) {
          toast.success("Conexão com Resend validada!");
        } else {
          toast.error(data.message || "Falha na validação");
        }
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: `Erro inesperado: ${err.message}`,
      });
      toast.error("Erro inesperado ao validar");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveEmailConfig = () => {
    onSave('email_config', formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verificado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Status da Conexão Resend
          </CardTitle>
          <CardDescription>
            Verifique se a integração com o Resend está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key Configurada</Label>
            <div className="flex gap-2">
              <Input
                value="re_••••••••••••••••••••••••"
                disabled
                className="font-mono bg-muted"
              />
              <Button 
                onClick={validateResendKey} 
                disabled={isValidating}
                variant="outline"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Testar Conexão"
                )}
              </Button>
            </div>
          </div>

          {validationResult && (
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {validationResult.valid ? "Conexão Estabelecida" : "Falha na Conexão"}
              </AlertTitle>
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="pt-2">
            <a
              href="https://resend.com/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir Dashboard do Resend
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Domains */}
      {validationResult?.valid && validationResult.domains && validationResult.domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Domínios Configurados
            </CardTitle>
            <CardDescription>
              Domínios verificados para envio de emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResult.domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{domain.name}</span>
                  </div>
                  {getStatusBadge(domain.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Email Padrão</CardTitle>
          <CardDescription>
            Defina o remetente padrão para emails do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sender_email">Email do Remetente</Label>
              <Input
                id="sender_email"
                type="email"
                placeholder="noreply@seudominio.com"
                value={formData.sender_email}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_name">Nome do Remetente</Label>
              <Input
                id="sender_name"
                placeholder="Nome da Empresa"
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reply_to">Responder Para (Reply-To)</Label>
            <Input
              id="reply_to"
              type="email"
              placeholder="suporte@seudominio.com"
              value={formData.reply_to}
              onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
            />
          </div>
          <Button onClick={handleSaveEmailConfig} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Instruções de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong className="text-foreground">1. Obter API Key:</strong>
              <p>Acesse <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/api-keys</a> e crie uma nova chave.</p>
            </div>
            <div>
              <strong className="text-foreground">2. Verificar Domínio:</strong>
              <p>Para enviar emails de um domínio personalizado, adicione e verifique em <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/domains</a>.</p>
            </div>
            <div>
              <strong className="text-foreground">3. Atualizar Secret Key:</strong>
              <p>Para atualizar a RESEND_API_KEY, acesse as configurações do projeto no Lovable Cloud e atualize a variável de ambiente.</p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              A API Key do Resend é uma informação sensível. Nunca compartilhe ou exponha publicamente.
              Use apenas domínios verificados para garantir a entregabilidade dos emails.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
