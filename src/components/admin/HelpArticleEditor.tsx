import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bold, Italic, Link, Heading2, Heading3, List, ListOrdered, Plus, Eye, Code, Edit3, Image } from "lucide-react";
import DOMPurify from "dompurify";

interface HelpArticleEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const TEMPLATES = {
  warning: `<div style="background: hsl(var(--destructive) / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border-left: 4px solid hsl(var(--destructive));">
  <span style="font-size: 1.25rem; margin-right: 0.5rem;">⚠️</span>
  <strong>Atenção:</strong> Texto de aviso aqui.
</div>`,
  tip: `<div style="background: hsl(var(--primary) / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border-left: 4px solid hsl(var(--primary));">
  <span style="font-size: 1.25rem; margin-right: 0.5rem;">💡</span>
  <strong>Dica:</strong> Texto da dica aqui.
</div>`,
  info: `<div style="background: hsl(210 100% 50% / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border-left: 4px solid hsl(210 100% 50%);">
  <span style="font-size: 1.25rem; margin-right: 0.5rem;">ℹ️</span>
  <strong>Nota:</strong> Informação adicional aqui.
</div>`,
  steps: `<ol style="list-style: decimal; padding-left: 1.5rem; margin: 1rem 0;">
  <li style="margin-bottom: 0.5rem;"><strong>Primeiro passo:</strong> Descrição</li>
  <li style="margin-bottom: 0.5rem;"><strong>Segundo passo:</strong> Descrição</li>
  <li style="margin-bottom: 0.5rem;"><strong>Terceiro passo:</strong> Descrição</li>
</ol>`,
  image: `<figure style="margin: 1.5rem 0; text-align: center;">
  <img src="URL_DA_IMAGEM" alt="Descrição da imagem" style="max-width: 100%; border-radius: 0.5rem; border: 1px solid hsl(var(--border));" />
  <figcaption style="margin-top: 0.5rem; font-size: 0.875rem; color: hsl(var(--muted-foreground));">Legenda da imagem</figcaption>
</figure>`,
};

export default function HelpArticleEditor({ value, onChange }: HelpArticleEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "html" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }, [value, onChange]);

  const wrapSelection = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = before + (selectedText || "texto") + after;
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + newText.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length + 5);
      }
    }, 0);
  }, [value, onChange]);

  const handleBold = () => wrapSelection("<strong>", "</strong>");
  const handleItalic = () => wrapSelection("<em>", "</em>");
  const handleLink = () => wrapSelection('<a href="#">', "</a>");
  const handleH2 = () => {
    const id = `heading-${Date.now()}`;
    wrapSelection(`<h2 id="${id}">`, "</h2>");
  };
  const handleH3 = () => {
    const id = `heading-${Date.now()}`;
    wrapSelection(`<h3 id="${id}">`, "</h3>");
  };
  const handleUL = () => insertAtCursor("\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>\n</ul>\n");
  const handleOL = () => insertAtCursor("\n<ol>\n  <li>Primeiro</li>\n  <li>Segundo</li>\n  <li>Terceiro</li>\n</ol>\n");

  const ToolbarButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-2">
          <TabsList className="bg-transparent h-10">
            <TabsTrigger value="edit" className="gap-1.5 data-[state=active]:bg-background">
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-1.5 data-[state=active]:bg-background">
              <Code className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 data-[state=active]:bg-background">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        {(activeTab === "edit" || activeTab === "html") && (
          <div className="flex items-center gap-1 p-2 border-b bg-muted/20 flex-wrap">
            <ToolbarButton onClick={handleBold} title="Negrito">
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleItalic} title="Itálico">
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleLink} title="Link">
              <Link className="h-4 w-4" />
            </ToolbarButton>
            
            <div className="w-px h-5 bg-border mx-1" />
            
            <ToolbarButton onClick={handleH2} title="Título H2">
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleH3} title="Subtítulo H3">
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />
            
            <ToolbarButton onClick={handleUL} title="Lista com bullets">
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleOL} title="Lista numerada">
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Inserir
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => insertAtCursor(TEMPLATES.tip)}>
                  <span className="mr-2">💡</span> Box de dica
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor(TEMPLATES.warning)}>
                  <span className="mr-2">⚠️</span> Box de aviso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor(TEMPLATES.info)}>
                  <span className="mr-2">ℹ️</span> Box informativo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor(TEMPLATES.steps)}>
                  <span className="mr-2">📝</span> Passo a passo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor(TEMPLATES.image)}>
                  <Image className="h-4 w-4 mr-2" /> Imagem com legenda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escreva o conteúdo do artigo de ajuda..."
            className="min-h-[400px] font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-none"
          />
        </TabsContent>

        <TabsContent value="html" className="m-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<p>Conteúdo HTML...</p>"
            className="min-h-[400px] font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-none"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="min-h-[400px] p-6 bg-background overflow-auto">
            <div 
              className="help-content prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
