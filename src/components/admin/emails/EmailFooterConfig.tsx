import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Code, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailFooterConfigProps {
  settings: Record<string, any> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

const DEFAULT_FOOTER = `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 12px;">
  <p style="margin: 0 0 5px 0;"><strong>WebQ - Sites Profissionais</strong></p>
  <p style="margin: 0 0 5px 0;">suporte@webq.com.br</p>
  <p style="margin: 0; color: #999;">Este email foi enviado automaticamente. Por favor, não responda diretamente.</p>
</div>`;

export default function EmailFooterConfig({ settings, onSave, isSaving }: EmailFooterConfigProps) {
  const [footerHtml, setFooterHtml] = useState(DEFAULT_FOOTER);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    if (settings?.email_footer?.value?.html) {
      setFooterHtml(settings.email_footer.value.html);
    }
  }, [settings]);

  const handleSave = () => {
    onSave("email_footer", { html: footerHtml });
  };

  const handleReset = () => {
    setFooterHtml(DEFAULT_FOOTER);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rodapé Global de Emails</CardTitle>
        <CardDescription>
          Configure o rodapé que será adicionado automaticamente a todos os emails enviados pelo sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Editar HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="footer-html">HTML do Rodapé</Label>
              <Textarea
                id="footer-html"
                value={footerHtml}
                onChange={(e) => setFooterHtml(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="<div>Seu rodapé HTML aqui...</div>"
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="text-sm text-muted-foreground mb-4 pb-4 border-b">
                <p>Preview do rodapé como aparecerá nos emails:</p>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(footerHtml) }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Rodapé
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
