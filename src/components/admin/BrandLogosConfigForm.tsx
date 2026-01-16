import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Image, ExternalLink, Sun, Moon, Globe } from "lucide-react";
import { toast } from "sonner";

interface BrandLogosConfig {
  fullLogoLight: string;
  fullLogoDark: string;
  simpleLogoLight: string;
  simpleLogoDark: string;
  favicon: string;
}

interface BrandLogosConfigFormProps {
  settings?: Record<string, any>;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function BrandLogosConfigForm({ settings, onSave, isSaving }: BrandLogosConfigFormProps) {
  const [config, setConfig] = useState<BrandLogosConfig>({
    fullLogoLight: "",
    fullLogoDark: "",
    simpleLogoLight: "",
    simpleLogoDark: "",
    favicon: "",
  });

  useEffect(() => {
    if (settings?.brand_logos_config?.value) {
      setConfig(prev => ({ ...prev, ...settings.brand_logos_config.value }));
    }
  }, [settings]);

  // Apply favicon dynamically when config changes
  useEffect(() => {
    if (config.favicon) {
      const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = config.favicon;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = config.favicon;
        document.head.appendChild(link);
      }
    }
  }, [config.favicon]);

  const handleChange = (field: keyof BrandLogosConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave("brand_logos_config", config);
  };

  const LogoPreview = ({ url, label }: { url: string; label: string }) => (
    <div className="mt-2">
      {url ? (
        <div className="flex items-center gap-2">
          <div className="h-8 bg-muted rounded px-2 flex items-center">
            <img src={url} alt={label} className="h-6 object-contain" />
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Ver
          </a>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Nenhuma imagem configurada</span>
      )}
    </div>
  );

  const FaviconPreview = ({ url }: { url: string }) => (
    <div className="mt-2">
      {url ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
            <img src={url} alt="Favicon" className="h-6 w-6 object-contain" />
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Ver
          </a>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Nenhum favicon configurado</span>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Logomarcas do Sistema
        </CardTitle>
        <CardDescription>
          Configure as logomarcas que serão exibidas no cabeçalho, rodapé e outras áreas do sistema.
          As URLs podem ser obtidas na Biblioteca de Mídia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Favicon */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Favicon
            <span className="text-xs font-normal text-muted-foreground">(Ícone na aba do navegador)</span>
          </h3>
          
          <div className="space-y-2 max-w-md">
            <Label>URL do Favicon</Label>
            <Input
              placeholder="https://... (recomendado: 32x32px, PNG ou ICO)"
              value={config.favicon}
              onChange={(e) => handleChange("favicon", e.target.value)}
            />
            <FaviconPreview url={config.favicon} />
            <p className="text-xs text-muted-foreground">
              Recomendado: imagem quadrada 32x32px ou 64x64px em formato PNG ou ICO.
            </p>
          </div>
        </div>

        {/* Logo Completo - Áreas Públicas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Logo Completo
            <span className="text-xs font-normal text-muted-foreground">(Navbar pública e Footer)</span>
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Tema Claro (Logo Escuro)
              </Label>
              <Input
                placeholder="https://..."
                value={config.fullLogoLight}
                onChange={(e) => handleChange("fullLogoLight", e.target.value)}
              />
              <LogoPreview url={config.fullLogoLight} label="Logo Escuro" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Tema Escuro (Logo Claro)
              </Label>
              <Input
                placeholder="https://..."
                value={config.fullLogoDark}
                onChange={(e) => handleChange("fullLogoDark", e.target.value)}
              />
              <LogoPreview url={config.fullLogoDark} label="Logo Claro" />
            </div>
          </div>
        </div>

        {/* Logo Simples - Áreas Internas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Logo Simples (texto "WebQ")
            <span className="text-xs font-normal text-muted-foreground">(Áreas internas - Admin e Cliente)</span>
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Tema Claro (Logo Escuro)
              </Label>
              <Input
                placeholder="https://..."
                value={config.simpleLogoLight}
                onChange={(e) => handleChange("simpleLogoLight", e.target.value)}
              />
              <LogoPreview url={config.simpleLogoLight} label="Logo Simples Escuro" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Tema Escuro (Logo Claro)
              </Label>
              <Input
                placeholder="https://..."
                value={config.simpleLogoDark}
                onChange={(e) => handleChange("simpleLogoDark", e.target.value)}
              />
              <LogoPreview url={config.simpleLogoDark} label="Logo Simples Claro" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Logomarcas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
