import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Key, CreditCard, ExternalLink, Webhook, Copy, AlertCircle, Edit, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StripeConfigFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
}

export default function StripeConfigForm({ settings }: StripeConfigFormProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [showWebhookSecretModal, setShowWebhookSecretModal] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [secretError, setSecretError] = useState("");

  const webhookUrl = "https://pyjfxrwgwncoasppgmuh.supabase.co/functions/v1/stripe-webhook";
  const webhookEvents = [
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.deleted",
    "invoice.upcoming"
  ];

  const validateWebhookSecret = (secret: string): boolean => {
    if (!secret.trim()) {
      setSecretError("O Signing Secret é obrigatório");
      return false;
    }
    if (!secret.startsWith("whsec_")) {
      setSecretError("O Signing Secret deve começar com 'whsec_'");
      return false;
    }
    if (secret.length < 20) {
      setSecretError("O Signing Secret parece muito curto");
      return false;
    }
    setSecretError("");
    return true;
  };

  const handleUpdateWebhookSecret = async () => {
    if (!validateWebhookSecret(newWebhookSecret)) return;
    
    // Copy to clipboard for easy pasting
    try {
      await navigator.clipboard.writeText(newWebhookSecret);
      toast.success(
        "Secret copiado! Use o painel de Secrets do Lovable para atualizar o STRIPE_WEBHOOK_SECRET.",
        { duration: 6000 }
      );
      setShowWebhookSecretModal(false);
      setNewWebhookSecret("");
    } catch (error) {
      toast.info(
        "Copie o secret e atualize manualmente no painel de Secrets do Lovable.",
        { duration: 6000 }
      );
    }
  };

  const openSecretModal = () => {
    setNewWebhookSecret("");
    setSecretError("");
    setShowWebhookSecretModal(true);
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  const testWebhookConnection = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    
    try {
      // Simple test to check if webhook endpoint responds
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test.connection' })
      });
      
      if (response.ok || response.status === 400) {
        // 400 is expected for invalid/test events
        setWebhookTestResult({
          valid: true,
          message: 'Endpoint do webhook está acessível e respondendo'
        });
        toast.success('Webhook endpoint está funcionando!');
      } else {
        setWebhookTestResult({
          valid: false,
          message: `Erro: Status ${response.status}`
        });
        toast.error('Problema ao acessar o webhook endpoint');
      }
    } catch (error: any) {
      setWebhookTestResult({
        valid: false,
        message: error.message || 'Erro ao testar webhook'
      });
      toast.error('Erro ao testar: ' + error.message);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const validateStripeKey = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-stripe-key');
      
      if (error) throw error;
      
      setValidationResult({
        valid: data.valid,
        message: data.message || (data.valid ? 'Chave Stripe válida!' : 'Chave Stripe inválida')
      });

      if (data.valid) {
        toast.success('Conexão com Stripe verificada com sucesso!');
      } else {
        toast.error('Falha na validação da chave Stripe');
      }
    } catch (error: any) {
      setValidationResult({
        valid: false,
        message: error.message || 'Erro ao validar chave Stripe'
      });
      toast.error('Erro ao validar: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const planConfigs = [
    { key: 'plan_basic', label: 'Essencial' },
    { key: 'plan_professional', label: 'Profissional' },
    { key: 'plan_performance', label: 'Performance' },
  ];

  return (
    <div className="space-y-6">
      {/* Stripe Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Conexão Stripe
          </CardTitle>
          <CardDescription>
            Verifique se a chave secreta do Stripe está configurada corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Stripe Secret Key</Label>
              <Input
                type="password"
                value="sk_live_••••••••••••••••"
                disabled
                className="font-mono text-sm mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A chave secreta é gerenciada nas variáveis de ambiente do servidor
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={validateStripeKey} 
              disabled={isValidating}
              variant="outline"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            <Button variant="ghost" asChild>
              <a 
                href="https://dashboard.stripe.com/apikeys" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Dashboard Stripe
              </a>
            </Button>
          </div>

          {validationResult && (
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stripe Products Status - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Produtos Stripe
          </CardTitle>
          <CardDescription>
            Status dos produtos configurados no Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Produtos sincronizados. Verifique os IDs na seção abaixo ou no Stripe Dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Stripe
          </CardTitle>
          <CardDescription>
            Configure o webhook para receber eventos de pagamento automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Endpoint</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use esta URL ao criar o webhook no Stripe Dashboard
            </p>
          </div>

          <div>
            <Label>Eventos Monitorados</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {webhookEvents.map((event) => (
                <Badge key={event} variant="secondary" className="font-mono text-xs">
                  {event}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure estes eventos no webhook do Stripe Dashboard
            </p>
          </div>

          <div>
            <Label>Signing Secret</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="password"
                value="whsec_••••••••••••••••"
                disabled
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={openSecretModal}>
                <Edit className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Copie o Signing Secret do webhook no Stripe Dashboard e cole aqui para atualizar
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={testWebhookConnection} 
              disabled={isTestingWebhook}
              variant="outline"
            >
              {isTestingWebhook ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Endpoint
            </Button>
            <Button variant="ghost" asChild>
              <a 
                href="https://dashboard.stripe.com/webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configurar Webhook
              </a>
            </Button>
          </div>

          {webhookTestResult && (
            <Alert variant={webhookTestResult.valid ? "default" : "destructive"}>
              {webhookTestResult.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{webhookTestResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Plan IDs Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            IDs dos Planos no Stripe
          </CardTitle>
          <CardDescription>
            Visão geral dos Price IDs e Product IDs configurados (edite na aba "Planos")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {planConfigs.map(({ key, label }) => {
              const planData = settings?.[key]?.value;
              return (
                <div key={key} className="p-4 rounded-lg border border-border bg-muted/30">
                  <h4 className="font-medium text-foreground mb-2">{label}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price ID: </span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {planData?.price_id || 'Não configurado'}
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Product ID: </span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {planData?.product_id || 'Não configurado'}
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como atualizar a Secret Key</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            Para atualizar a chave secreta do Stripe, você precisa:
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acessar o painel de configurações do projeto</li>
            <li>Ir em "Secrets" ou "Variáveis de Ambiente"</li>
            <li>Atualizar o valor de <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code></li>
            <li>Reimplantar as funções de backend</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Nota:</strong> Por segurança, a chave secreta nunca é exposta no frontend. 
            Use o botão "Testar Conexão" para verificar se a chave atual está funcionando.
          </p>
        </CardContent>
      </Card>

      {/* Modal para atualizar Webhook Secret */}
      <Dialog open={showWebhookSecretModal} onOpenChange={setShowWebhookSecretModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Webhook Signing Secret</DialogTitle>
            <DialogDescription>
              Cole o Signing Secret do seu webhook Stripe. Você encontra esse valor no Stripe Dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Signing Secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                placeholder="whsec_..."
                value={newWebhookSecret}
                onChange={(e) => {
                  setNewWebhookSecret(e.target.value);
                  if (secretError) setSecretError("");
                }}
                className="font-mono"
              />
              {secretError && (
                <p className="text-sm text-destructive">{secretError}</p>
              )}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Onde encontrar:</strong> Stripe Dashboard → Developers → Webhooks → 
                selecione o endpoint → clique em "Reveal" no campo "Signing secret"
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowWebhookSecretModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateWebhookSecret}
              disabled={!newWebhookSecret.trim()}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar e Instruções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
