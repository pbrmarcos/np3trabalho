import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Eye, Code, Info } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  trigger: string;
  subject: string;
  html_template: string;
  is_active: boolean;
  copy_to_admins: boolean;
  sender_email: string;
  sender_name: string;
}

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: EmailTemplate) => void;
}

const AVAILABLE_VARIABLES = [
  { key: "client_name", description: "Nome do cliente" },
  { key: "client_email", description: "Email do cliente" },
  { key: "project_name", description: "Nome do projeto" },
  { key: "ticket_id", description: "ID do ticket" },
  { key: "ticket_title", description: "Título do ticket" },
  { key: "ticket_url", description: "URL do ticket" },
  { key: "response_preview", description: "Preview da resposta" },
  { key: "new_status", description: "Novo status" },
  { key: "plan_name", description: "Nome do plano" },
  { key: "amount", description: "Valor" },
  { key: "payment_date", description: "Data do pagamento" },
  { key: "failure_reason", description: "Motivo da falha" },
  { key: "payment_url", description: "URL de pagamento" },
  { key: "file_name", description: "Nome do arquivo" },
  { key: "file_type", description: "Tipo do arquivo" },
  { key: "file_url", description: "URL do arquivo" },
  { key: "dashboard_url", description: "URL do painel" },
  { key: "code", description: "Código de verificação" },
];

export default function EmailTemplateEditor({
  template,
  open,
  onOpenChange,
  onSave,
}: EmailTemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState(template);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    setEditedTemplate(template);
  }, [template]);

  const handleSave = () => {
    onSave(editedTemplate);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("html-template") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editedTemplate.html_template;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variable}}}${after}`;
      setEditedTemplate({ ...editedTemplate, html_template: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4;
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Template: {template.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-2">
              <Info className="h-4 w-4" />
              Variáveis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender_name">Nome do Remetente</Label>
                <Input
                  id="sender_name"
                  value={editedTemplate.sender_name}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, sender_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_email">Email do Remetente</Label>
                <Input
                  id="sender_email"
                  type="email"
                  value={editedTemplate.sender_email}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, sender_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={editedTemplate.subject}
                onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                placeholder="Assunto do email (suporta variáveis)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="html-template">Template HTML</Label>
              <Textarea
                id="html-template"
                value={editedTemplate.html_template}
                onChange={(e) => setEditedTemplate({ ...editedTemplate, html_template: e.target.value })}
                className="font-mono text-sm min-h-[300px]"
                placeholder="<div>Seu HTML aqui...</div>"
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-muted-foreground">
                  <strong>De:</strong> {editedTemplate.sender_name} &lt;{editedTemplate.sender_email}&gt;
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Assunto:</strong> {editedTemplate.subject}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editedTemplate.html_template) }}
              />
            </div>
          </TabsContent>

          <TabsContent value="variables" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique em uma variável para inseri-la no template. Use o formato <code className="bg-muted px-1 rounded">{"{{variavel}}"}</code> no seu HTML.
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Badge
                    key={variable.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => insertVariable(variable.key)}
                    role="button"
                    aria-label={`Inserir variável ${variable.key}: ${variable.description}`}
                  >
                    {`{{${variable.key}}}`}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">Referência de Variáveis:</h4>
                <div className="grid gap-2 text-sm">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <div key={variable.key} className="flex gap-2">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">{`{{${variable.key}}}`}</code>
                      <span className="text-muted-foreground">{variable.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
