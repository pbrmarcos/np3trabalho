import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, CheckCircle2, Search, FileText, Loader2, RefreshCw, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GoogleSearchConsoleConfig {
  verification_code: string;
  sitemap_url: string;
  property_url: string;
}

interface SitemapPreview {
  counts: {
    static: number;
    blogPosts: number;
    isolatedPages: number;
    helpCategories: number;
    helpArticles: number;
    total: number;
  };
  urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }>;
}

interface GoogleSearchConsoleConfigFormProps {
  settings?: Record<string, any>;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function GoogleSearchConsoleConfigForm({ settings, onSave, isSaving }: GoogleSearchConsoleConfigFormProps) {
  const existingConfig = settings?.google_search_console_config?.value as GoogleSearchConsoleConfig | undefined;
  
  const [config, setConfig] = useState<GoogleSearchConsoleConfig>({
    verification_code: "",
    sitemap_url: "",
    property_url: ""
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [sitemapPreview, setSitemapPreview] = useState<SitemapPreview | null>(null);
  const [showXmlDialog, setShowXmlDialog] = useState(false);
  const [fullXml, setFullXml] = useState<string>("");

  useEffect(() => {
    if (existingConfig) {
      setConfig({
        verification_code: existingConfig.verification_code || "",
        sitemap_url: existingConfig.sitemap_url || "",
        property_url: existingConfig.property_url || ""
      });
    }
  }, [existingConfig]);

  const handleSave = () => {
    onSave('google_search_console_config', config);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const generateSitemap = async (preview: boolean = true) => {
    setIsGenerating(true);
    try {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams({
        baseUrl,
        ...(preview && { preview: 'true' })
      });

      const { data, error } = await supabase.functions.invoke('generate-sitemap', {
        body: null,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // For preview, we need to call with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar sitemap');
      }

      if (preview) {
        const data = await response.json();
        setSitemapPreview(data);
        toast.success(`Sitemap gerado com ${data.counts.total} URLs!`);
      } else {
        const xml = await response.text();
        setFullXml(xml);
        setShowXmlDialog(true);
      }
    } catch (error) {
      console.error('Error generating sitemap:', error);
      toast.error('Erro ao gerar sitemap');
    } finally {
      setIsGenerating(false);
    }
  };

  const viewFullXml = async () => {
    setIsGenerating(true);
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?baseUrl=${encodeURIComponent(baseUrl)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar sitemap');
      }

      const xml = await response.text();
      setFullXml(xml);
      setShowXmlDialog(true);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      toast.error('Erro ao gerar sitemap');
    } finally {
      setIsGenerating(false);
    }
  };

  const isConfigured = !!config.verification_code;
  const publicSitemapUrl = "https://webq.com.br/sitemap.xml";
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?baseUrl=${encodeURIComponent("https://webq.com.br")}`;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={isConfigured ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">Verificação Configurada</p>
                  <p className="text-sm text-muted-foreground">A meta tag de verificação será inserida automaticamente em todas as páginas.</p>
                </div>
              </>
            ) : (
              <>
                <Search className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">Verificação Pendente</p>
                  <p className="text-sm text-muted-foreground">Configure o código de verificação para ativar o Google Search Console.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Verificação do Site
          </CardTitle>
          <CardDescription>
            O código de verificação é inserido automaticamente como meta tag no {"<head>"} de todas as páginas públicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification_code">Código de Verificação</Label>
            <Input
              id="verification_code"
              placeholder="AbCdEfGhIjKlMnOpQrStUvWxYz1234567890"
              value={config.verification_code}
              onChange={(e) => setConfig({ ...config, verification_code: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Cole apenas o código (valor do content="..."), não a tag meta completa.
            </p>
          </div>

          {config.verification_code && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Meta tag que será inserida:</p>
              <code className="text-xs break-all">
                {'<meta name="google-site-verification" content="'}{config.verification_code}{'" />'}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sitemap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sitemap
          </CardTitle>
          <CardDescription>
            Gere o sitemap automaticamente com todas as páginas públicas, blog e central de ajuda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL Pública do Sitemap</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={publicSitemapUrl}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(publicSitemapUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(publicSitemapUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta URL redireciona automaticamente para o sitemap gerado dinamicamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => generateSitemap(true)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Gerar Preview
            </Button>
            <Button
              variant="outline"
              onClick={viewFullXml}
              disabled={isGenerating}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver XML
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const baseUrl = "https://webq.com.br";
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?baseUrl=${encodeURIComponent(baseUrl)}`;
                const link = document.createElement('a');
                link.href = url;
                link.download = 'sitemap.xml';
                link.target = '_blank';
                link.click();
                toast.success("Download iniciado!");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar XML
            </Button>
          </div>

          {/* Preview Results */}
          {sitemapPreview && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Preview do Sitemap</p>
                <Badge variant="secondary">{sitemapPreview.counts.total} URLs</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{sitemapPreview.counts.static} páginas estáticas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{sitemapPreview.counts.blogPosts} artigos do blog</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{sitemapPreview.counts.isolatedPages} páginas isoladas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{sitemapPreview.counts.helpCategories} categorias de ajuda</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{sitemapPreview.counts.helpArticles} artigos de ajuda</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como Configurar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">1</Badge>
              <div>
                <p className="font-medium">Acesse o Google Search Console</p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary"
                  onClick={() => window.open('https://search.google.com/search-console', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir Google Search Console
                </Button>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">2</Badge>
              <div>
                <p className="font-medium">Clique em "Adicionar propriedade"</p>
                <p className="text-muted-foreground">No menu lateral esquerdo</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">3</Badge>
              <div>
                <p className="font-medium">Escolha "Prefixo do URL"</p>
                <p className="text-muted-foreground">E insira a URL completa do seu site</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">4</Badge>
              <div>
                <p className="font-medium">Selecione "Tag HTML" como método</p>
                <p className="text-muted-foreground">Na lista de métodos de verificação</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">5</Badge>
              <div>
                <p className="font-medium">Copie APENAS o código</p>
                <p className="text-muted-foreground">O valor dentro de content="..." (não a tag completa)</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">6</Badge>
              <div>
                <p className="font-medium">Cole no campo acima e salve</p>
                <p className="text-muted-foreground">A meta tag será inserida automaticamente</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">7</Badge>
              <div>
                <p className="font-medium">Volte ao Google e clique em "Verificar"</p>
                <p className="text-muted-foreground">O Google detectará a meta tag no site</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center">8</Badge>
              <div>
                <p className="font-medium">Submeta o Sitemap</p>
                <p className="text-muted-foreground">Em "Sitemaps", adicione a URL do sitemap gerada acima</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>

      {/* XML Preview Dialog */}
      <Dialog open={showXmlDialog} onOpenChange={setShowXmlDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sitemap XML</DialogTitle>
            <DialogDescription>
              Conteúdo completo do sitemap gerado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(fullXml)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar XML
              </Button>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-lg border bg-muted/30 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">{fullXml}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
