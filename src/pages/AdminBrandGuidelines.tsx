import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const colors = [
  { name: "Primary (Dark Navy)", hex: "#1E2A47", hsl: "222 41% 20%", usage: "Fundos escuros, títulos principais, header" },
  { name: "Primary Foreground", hex: "#F8FAFC", hsl: "210 40% 98%", usage: "Texto sobre fundos escuros" },
  { name: "Accent (Electric Blue)", hex: "#3B82F6", hsl: "217 91% 60%", usage: "CTAs, links, destaques, badges" },
  { name: "Background Light", hex: "#F8FAFC", hsl: "210 40% 98%", usage: "Fundo principal tema claro" },
  { name: "Background Dark", hex: "#0F172A", hsl: "222 47% 11%", usage: "Fundo principal tema escuro" },
  { name: "Muted", hex: "#F1F5F9", hsl: "210 40% 96%", usage: "Fundos secundários, cards" },
  { name: "Border", hex: "#E2E8F0", hsl: "214 32% 91%", usage: "Bordas, divisores" },
  { name: "Destructive", hex: "#EF4444", hsl: "0 84% 60%", usage: "Erros, alertas, ações destrutivas" },
  { name: "Success", hex: "#22C55E", hsl: "142 71% 45%", usage: "Confirmações, status ativo" },
  { name: "Warning", hex: "#F59E0B", hsl: "38 92% 50%", usage: "Avisos, pendências" },
];

const typography = [
  { name: "Space Grotesk", weight: "700 (Bold)", usage: "Títulos, headings, logos", example: "WebQ Digital" },
  { name: "Space Grotesk", weight: "600 (Semibold)", usage: "Subtítulos, botões", example: "Começar Agora" },
  { name: "Inter", weight: "400 (Regular)", usage: "Corpo de texto, parágrafos", example: "Criamos sites profissionais que convertem visitantes em clientes." },
  { name: "Inter", weight: "500 (Medium)", usage: "Labels, navegação", example: "Dashboard • Projetos • Configurações" },
];

const gradients = [
  { name: "Hero Gradient", css: "linear-gradient(135deg, #1E2A47 0%, #0F172A 100%)", usage: "Hero sections, banners" },
  { name: "Accent Gradient", css: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", usage: "Botões destacados, CTAs" },
  { name: "Card Gradient", css: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, transparent 100%)", usage: "Cards hover, destaques" },
];

export default function AdminBrandGuidelines() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(name);
    toast({ title: "Copiado!", description: `${name} copiado para a área de transferência.` });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const breadcrumbs = [
    { label: "Mídia", href: "/admin/media" },
    { label: "Brand Guidelines" },
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="print:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin/media")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Brand Guidelines</h1>
              <p className="text-muted-foreground">Identidade visual WebQ - Cores, tipografia e padrões</p>
            </div>
          </div>
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>

        {/* Print Header */}
        <div className="hidden print:block print:mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">WebQ Brand Guidelines</h1>
          <p className="text-lg text-muted-foreground">Manual de Identidade Visual</p>
        </div>

        <div ref={contentRef} className="space-y-8">
          {/* Colors Section */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Paleta de Cores</CardTitle>
              <p className="text-muted-foreground">Cores principais da identidade visual WebQ</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
                {colors.map((color) => (
                  <div key={color.name} className="border rounded-lg overflow-hidden">
                    <div 
                      className="h-20 print:h-16" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="p-3 space-y-2">
                      <h4 className="font-semibold text-sm">{color.name}</h4>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{color.hex}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 print:hidden"
                          onClick={() => copyToClipboard(color.hex, color.name)}
                        >
                          {copiedColor === color.name ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gradients Section */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Gradientes</CardTitle>
              <p className="text-muted-foreground">Gradientes para fundos e destaques</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                {gradients.map((gradient) => (
                  <div key={gradient.name} className="border rounded-lg overflow-hidden">
                    <div 
                      className="h-24 print:h-16" 
                      style={{ background: gradient.css }}
                    />
                    <div className="p-3 space-y-2">
                      <h4 className="font-semibold text-sm">{gradient.name}</h4>
                      <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{gradient.css}</code>
                      <p className="text-xs text-muted-foreground">{gradient.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Typography Section */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Tipografia</CardTitle>
              <p className="text-muted-foreground">Fontes e pesos tipográficos</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {typography.map((type, index) => (
                  <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="md:w-1/3">
                        <h4 className="font-semibold">{type.name}</h4>
                        <p className="text-sm text-muted-foreground">{type.weight}</p>
                        <p className="text-xs text-muted-foreground mt-1">{type.usage}</p>
                      </div>
                      <div className="md:w-2/3 p-4 bg-muted rounded-lg">
                        <p 
                          className="text-lg"
                          style={{ 
                            fontFamily: type.name === "Space Grotesk" ? "'Space Grotesk', sans-serif" : "'Inter', sans-serif",
                            fontWeight: type.weight.includes("700") ? 700 : type.weight.includes("600") ? 600 : type.weight.includes("500") ? 500 : 400
                          }}
                        >
                          {type.example}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Examples */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Exemplos de Uso</CardTitle>
              <p className="text-muted-foreground">Aplicações práticas da identidade visual</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Buttons */}
              <div>
                <h4 className="font-semibold mb-3">Botões</h4>
                <div className="flex flex-wrap gap-3">
                  <Button>Botão Primário</Button>
                  <Button variant="secondary">Botão Secundário</Button>
                  <Button variant="outline">Botão Outline</Button>
                  <Button variant="destructive">Botão Destrutivo</Button>
                </div>
              </div>

              {/* Cards Example */}
              <div>
                <h4 className="font-semibold mb-3">Cards</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                  <div className="p-4 bg-primary text-primary-foreground rounded-lg">
                    <h5 className="font-semibold">Card Escuro</h5>
                    <p className="text-sm opacity-80">Texto sobre fundo primário</p>
                  </div>
                  <div className="p-4 bg-accent text-accent-foreground rounded-lg">
                    <h5 className="font-semibold">Card Accent</h5>
                    <p className="text-sm opacity-80">Texto sobre fundo accent</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-semibold">Card Muted</h5>
                    <p className="text-sm text-muted-foreground">Texto sobre fundo muted</p>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div>
                <h4 className="font-semibold mb-3">Status & Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-600 rounded-full text-sm font-medium">Ativo</span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-600 rounded-full text-sm font-medium">Pendente</span>
                  <span className="px-3 py-1 bg-red-500/20 text-red-600 rounded-full text-sm font-medium">Inativo</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-600 rounded-full text-sm font-medium">Em Progresso</span>
                </div>
              </div>

              {/* Text Hierarchy */}
              <div>
                <h4 className="font-semibold mb-3">Hierarquia de Texto</h4>
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <h1 className="text-3xl font-bold">Título H1 - Space Grotesk Bold</h1>
                  <h2 className="text-2xl font-semibold">Título H2 - Space Grotesk Semibold</h2>
                  <h3 className="text-xl font-medium">Título H3 - Inter Medium</h3>
                  <p className="text-base">Parágrafo - Inter Regular. Texto corrido para demonstrar a legibilidade.</p>
                  <p className="text-sm text-muted-foreground">Texto secundário - Inter Regular, cor muted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Referência Rápida</CardTitle>
              <p className="text-muted-foreground">Resumo para uso em edição de imagens</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3">Cores Principais</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span>Background escuro:</span> <code>#1E2A47</code></li>
                    <li className="flex justify-between"><span>Accent (destaque):</span> <code>#3B82F6</code></li>
                    <li className="flex justify-between"><span>Texto claro:</span> <code>#F8FAFC</code></li>
                    <li className="flex justify-between"><span>Texto escuro:</span> <code>#0F172A</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Fontes</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span>Títulos:</span> <code>Space Grotesk Bold</code></li>
                    <li className="flex justify-between"><span>Subtítulos:</span> <code>Space Grotesk Semibold</code></li>
                    <li className="flex justify-between"><span>Corpo:</span> <code>Inter Regular</code></li>
                    <li className="flex justify-between"><span>Labels:</span> <code>Inter Medium</code></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayoutWithSidebar>
  );
}
