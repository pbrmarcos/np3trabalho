import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowRight, Building2, Palette, Upload, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUpload, DESIGN_VALIDATION } from "@/components/FileUpload";

interface DesignOnlyOnboardingProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const businessTypes = [
  { value: "advogado", label: "Advogado / Escritório Jurídico" },
  { value: "saude", label: "Saúde / Clínica / Consultório" },
  { value: "construcao", label: "Construção / Engenharia" },
  { value: "restaurante", label: "Restaurante / Alimentação" },
  { value: "beleza", label: "Beleza / Estética" },
  { value: "educacao", label: "Educação / Cursos" },
  { value: "tecnologia", label: "Tecnologia / Software" },
  { value: "imobiliario", label: "Imobiliário / Corretor" },
  { value: "contabilidade", label: "Contabilidade / Finanças" },
  { value: "pet", label: "Pet Shop / Veterinária" },
  { value: "turismo", label: "Turismo / Viagens" },
  { value: "moda", label: "Moda / Vestuário" },
  { value: "varejo", label: "Varejo / Loja" },
  { value: "industria", label: "Indústria / Fabricação" },
  { value: "consultoria", label: "Consultoria" },
  { value: "marketing", label: "Marketing / Publicidade" },
  { value: "fotografia", label: "Fotografia / Vídeo" },
  { value: "eventos", label: "Eventos / Buffet" },
  { value: "outro", label: "Outro" },
];

export function DesignOnlyOnboarding({ userId, userName, userEmail, onComplete, onSkip }: DesignOnlyOnboardingProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    business_type: "",
    business_description: "",
    whatsapp: "",
    instagram: "",
    has_brand_identity: "no",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async () => {
    if (!formData.company_name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    if (!formData.business_type) {
      toast.error("Selecione o ramo de atuação");
      return;
    }
    if (!formData.whatsapp || formData.whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("WhatsApp inválido");
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile && formData.has_brand_identity === "yes") {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("client-logos")
          .upload(fileName, logoFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("client-logos")
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }

      // Insert onboarding data for design-only client
      const { error } = await supabase
        .from("client_onboarding")
        .insert({
          user_id: userId,
          company_name: formData.company_name.trim(),
          business_type: formData.business_type,
          business_description: formData.business_description.trim() || null,
          whatsapp: formData.whatsapp,
          instagram: formData.instagram.trim() || null,
          has_logo: formData.has_brand_identity === "yes",
          logo_url: logoUrl,
          is_design_only: true,
          has_brand_identity: formData.has_brand_identity === "yes",
          selected_plan: "design_only",
        });

      if (error) throw error;

      toast.success("Dados salvos com sucesso!");
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {userName && (
        <div className="text-center">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Bem-vindo, {userName.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground mt-2">
            Antes de continuar, conte um pouco sobre seu negócio para personalizarmos seus projetos.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Sobre seu Negócio
          </CardTitle>
          <CardDescription>
            Essas informações nos ajudam a criar designs personalizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome da Empresa *</Label>
            <Input
              id="company_name"
              placeholder="Ex: Escritório Silva & Associados"
              value={formData.company_name}
              onChange={(e) => handleInputChange("company_name", e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_type">Ramo de Atuação *</Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) => handleInputChange("business_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ramo..." />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_description">O que sua empresa faz? (opcional)</Label>
            <Textarea
              id="business_description"
              placeholder="Descreva brevemente os serviços ou produtos que sua empresa oferece..."
              value={formData.business_description}
              onChange={(e) => handleInputChange("business_description", e.target.value)}
              maxLength={200}
              rows={2}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.business_description.length}/200
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                placeholder="(99) 99999-9999"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange("whatsapp", formatWhatsApp(e.target.value))}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram (opcional)</Label>
              <Input
                id="instagram"
                placeholder="@suaempresa"
                value={formData.instagram}
                onChange={(e) => handleInputChange("instagram", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Identidade Visual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Já possui logo/identidade visual?</Label>
            <RadioGroup
              value={formData.has_brand_identity}
              onValueChange={(value) => handleInputChange("has_brand_identity", value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="brand-yes" />
                <Label htmlFor="brand-yes" className="font-normal cursor-pointer">Sim, já tenho</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="brand-no" />
                <Label htmlFor="brand-no" className="font-normal cursor-pointer">Não tenho ainda</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.has_brand_identity === "yes" && (
            <div className="space-y-2">
              <Label>Upload da logo (opcional)</Label>
              <FileUpload
                files={logoFile ? [logoFile] : []}
                onFilesSelected={(files) => setLogoFile(files[0] || null)}
                onFileRemove={() => setLogoFile(null)}
                maxFiles={1}
                validation={DESIGN_VALIDATION}
                accept="image/*,.pdf,.ai,.svg"
                label="Sua logo"
                description="PNG, JPG, SVG, AI ou PDF"
                variant="compact"
              />
            </div>
          )}

          {formData.has_brand_identity === "no" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Palette className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Sem problemas!</p>
                <p className="text-muted-foreground">
                  Você pode contratar nosso serviço de <strong>Criação de Marca</strong> para ter uma identidade visual completa.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Continuar para Design
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        
        {onSkip && (
          <Button 
            variant="ghost" 
            onClick={onSkip} 
            disabled={isSubmitting}
            className="text-muted-foreground"
          >
            Pular esta etapa
          </Button>
        )}
      </div>
    </div>
  );
}
