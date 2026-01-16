import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Image, Eye } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface DesignServicesConfig {
  background_image?: string;
  enable_background?: boolean;
  overlay_opacity?: number;
}

interface DesignBackgroundConfigFormProps {
  settings: Record<string, Json> | undefined;
  onSave: (key: string, value: Json) => void;
  isSaving: boolean;
}

export default function DesignBackgroundConfigForm({ 
  settings, 
  onSave, 
  isSaving 
}: DesignBackgroundConfigFormProps) {
  const [config, setConfig] = useState<DesignServicesConfig>({
    background_image: '/images/coding-workspace.png',
    enable_background: true,
    overlay_opacity: 85
  });

  useEffect(() => {
    if (settings?.design_services_config) {
      const savedConfig = settings.design_services_config as DesignServicesConfig;
      setConfig({
        background_image: savedConfig.background_image || '/images/coding-workspace.png',
        enable_background: savedConfig.enable_background ?? true,
        overlay_opacity: savedConfig.overlay_opacity ?? 85
      });
    }
  }, [settings]);

  const handleSave = () => {
    onSave('design_services_config', config as unknown as Json);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Imagem de Fundo - Design Services
        </CardTitle>
        <CardDescription>
          Configure a imagem de fundo exibida na seção de serviços de design na homepage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Enable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable-bg">Ativar imagem de fundo</Label>
            <p className="text-sm text-muted-foreground">
              Quando desativado, a seção terá fundo sólido
            </p>
          </div>
          <Switch
            id="enable-bg"
            checked={config.enable_background}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_background: checked }))}
          />
        </div>

        {config.enable_background && (
          <>
            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="bg-image">URL da Imagem</Label>
              <Input
                id="bg-image"
                value={config.background_image}
                onChange={(e) => setConfig(prev => ({ ...prev, background_image: e.target.value }))}
                placeholder="/images/coding-workspace.png"
              />
              <p className="text-xs text-muted-foreground">
                Use uma URL de imagem ou caminho relativo. Recomendado: 1920x1080 ou maior.
              </p>
            </div>

            {/* Overlay Opacity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Opacidade do Overlay</Label>
                <span className="text-sm text-muted-foreground">{config.overlay_opacity}%</span>
              </div>
              <Slider
                value={[config.overlay_opacity || 85]}
                onValueChange={(value) => setConfig(prev => ({ ...prev, overlay_opacity: value[0] }))}
                min={60}
                max={95}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controla a escuridão do overlay para garantir legibilidade do texto.
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Prévia
              </Label>
              <div 
                className="relative h-32 rounded-lg overflow-hidden border"
                style={{
                  backgroundImage: `url('${config.background_image}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: `hsl(var(--background) / ${(config.overlay_opacity || 85) / 100})` }}
                >
                  <span className="text-foreground font-semibold">Design Digital Profissional</span>
                </div>
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
