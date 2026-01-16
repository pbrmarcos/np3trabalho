import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Instagram, Linkedin, Facebook, Twitter, MessageCircle } from "lucide-react";

interface SocialMediaLink {
  enabled: boolean;
  url: string;
}

interface SocialMediaConfig {
  instagram: SocialMediaLink;
  linkedin: SocialMediaLink;
  facebook: SocialMediaLink;
  twitter: SocialMediaLink;
  discord: SocialMediaLink;
  youtube: SocialMediaLink;
  tiktok: SocialMediaLink;
  whatsapp_number: string;
  whatsapp_message: string;
}

interface SocialMediaConfigFormProps {
  settings: Record<string, any>;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

const defaultConfig: SocialMediaConfig = {
  instagram: { enabled: true, url: "" },
  linkedin: { enabled: true, url: "" },
  facebook: { enabled: true, url: "" },
  twitter: { enabled: true, url: "" },
  discord: { enabled: true, url: "" },
  youtube: { enabled: false, url: "" },
  tiktok: { enabled: false, url: "" },
  whatsapp_number: "",
  whatsapp_message: "Olá! Gostaria de saber mais sobre os serviços da WebQ."
};

const socialMediaOptions = [
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/webq" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/webq" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/webq" },
  { key: "twitter", label: "Twitter / X", icon: Twitter, placeholder: "https://x.com/webq" },
  { key: "discord", label: "Discord", icon: MessageCircle, placeholder: "https://discord.gg/webq" },
  { key: "youtube", label: "YouTube", icon: null, placeholder: "https://youtube.com/@webq" },
  { key: "tiktok", label: "TikTok", icon: null, placeholder: "https://tiktok.com/@webq" },
];

export default function SocialMediaConfigForm({ settings, onSave, isSaving }: SocialMediaConfigFormProps) {
  const [config, setConfig] = useState<SocialMediaConfig>(defaultConfig);

  useEffect(() => {
    if (settings?.contact_config) {
      const saved = settings.contact_config;
      setConfig({
        ...defaultConfig,
        ...saved,
        instagram: { ...defaultConfig.instagram, ...saved.instagram },
        linkedin: { ...defaultConfig.linkedin, ...saved.linkedin },
        facebook: { ...defaultConfig.facebook, ...saved.facebook },
        twitter: { ...defaultConfig.twitter, ...saved.twitter },
        discord: { ...defaultConfig.discord, ...saved.discord },
        youtube: { ...defaultConfig.youtube, ...saved.youtube },
        tiktok: { ...defaultConfig.tiktok, ...saved.tiktok },
      });
    }
  }, [settings]);

  const handleToggle = (key: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev] as SocialMediaLink, enabled }
    }));
  };

  const handleUrlChange = (key: string, url: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev] as SocialMediaLink, url }
    }));
  };

  const handleSave = () => {
    onSave("contact_config", config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Redes Sociais e Contato</CardTitle>
        <CardDescription>
          Configure as redes sociais que aparecem no rodapé do site. Ative apenas as redes que deseja exibir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {socialMediaOptions.map(({ key, label, icon: Icon, placeholder }) => {
            const socialConfig = config[key as keyof SocialMediaConfig] as SocialMediaLink;
            
            return (
              <div key={key} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={socialConfig?.enabled || false}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <Label className="font-medium">{label}</Label>
                  </div>
                </div>
                <Input
                  placeholder={placeholder}
                  value={socialConfig?.url || ""}
                  onChange={(e) => handleUrlChange(key, e.target.value)}
                  disabled={!socialConfig?.enabled}
                  className="flex-1"
                />
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-sm">WhatsApp de Contato</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Número (com código do país)</Label>
              <Input
                placeholder="5547988447665"
                value={config.whatsapp_number}
                onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem padrão</Label>
              <Input
                placeholder="Olá! Gostaria de saber mais..."
                value={config.whatsapp_message}
                onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_message: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
