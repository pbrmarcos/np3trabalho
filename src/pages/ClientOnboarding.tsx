import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Loader2, Upload, Palette, Check, X, Image, Phone, Mail, 
  RefreshCw, Headphones, HelpCircle, CheckCircle2, Building2, Globe, MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAction } from "@/services/auditService";
import { notifyAllAdminsMigrationRequest } from "@/services/notificationService";
import { ImageUploadGrid } from "@/components/FileUpload";
import ClientLayout from "@/components/ClientLayout";
import { Progress } from "@/components/ui/progress";

const businessTypes = [
  { value: "advogado", label: "Advogado / Escritório Jurídico" },
  { value: "saude", label: "Saúde / Clínica / Consultório" },
  { value: "construcao", label: "Construção / Engenharia / Arquitetura" },
  { value: "restaurante", label: "Restaurante / Alimentação / Delivery" },
  { value: "beleza", label: "Beleza / Estética / Salão" },
  { value: "educacao", label: "Educação / Cursos / Treinamentos" },
  { value: "tecnologia", label: "Tecnologia / Software / TI" },
  { value: "imobiliario", label: "Imobiliária / Corretor de Imóveis" },
  { value: "contabilidade", label: "Contabilidade / Finanças" },
  { value: "pet", label: "Pet Shop / Veterinária" },
  { value: "turismo", label: "Turismo / Hotelaria / Eventos" },
  { value: "moda", label: "Moda / Vestuário / Acessórios" },
  { value: "varejo", label: "Varejo / Comércio / Loja" },
  { value: "industria", label: "Indústria / Fabricação" },
  { value: "consultoria", label: "Consultoria / Assessoria" },
  { value: "marketing", label: "Marketing / Publicidade / Design" },
  { value: "fotografia", label: "Fotografia / Audiovisual" },
  { value: "automotivo", label: "Automotivo / Oficina / Concessionária" },
  { value: "agronegocio", label: "Agronegócio / Fazenda" },
  { value: "ong", label: "ONG / Instituição / Associação" },
  { value: "outro", label: "Outro" },
];

const domainProviders = [
  { value: "registro_br", label: "Registro.br" },
  { value: "locaweb", label: "Locaweb" },
  { value: "hostinger", label: "Hostinger" },
  { value: "godaddy", label: "GoDaddy" },
  { value: "hostgator", label: "HostGator" },
  { value: "uol_host", label: "UOL Host" },
  { value: "kinghost", label: "KingHost" },
  { value: "outro", label: "Outro" },
];

const migrationHosts = [
  { value: "locaweb", label: "Locaweb" },
  { value: "hostinger", label: "Hostinger" },
  { value: "godaddy", label: "GoDaddy" },
  { value: "hostgator", label: "HostGator" },
  { value: "uol_host", label: "UOL Host" },
  { value: "kinghost", label: "KingHost" },
  { value: "umbler", label: "Umbler" },
  { value: "wix", label: "Wix" },
  { value: "wordpress_com", label: "WordPress.com" },
  { value: "squarespace", label: "Squarespace" },
  { value: "outro", label: "Outro" },
];

const migrationSiteTypes = [
  { value: "wordpress", label: "WordPress" },
  { value: "html", label: "HTML/CSS Estático" },
  { value: "wix", label: "Wix" },
  { value: "squarespace", label: "Squarespace" },
  { value: "ecommerce", label: "E-commerce / Loja Virtual" },
  { value: "outro", label: "Outro" },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [inspirationPreviews, setInspirationPreviews] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // WhatsApp validation helper
  const validateWhatsApp = (value: string): boolean => {
    if (!value.trim()) {
      setWhatsappError("WhatsApp é obrigatório");
      return false;
    }
    // Remove all non-numeric characters for validation
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 11) {
      setWhatsappError("WhatsApp deve ter 10 ou 11 dígitos");
      return false;
    }
    setWhatsappError(null);
    return true;
  };

  // Format WhatsApp for display
  const formatWhatsApp = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Form state
  const [formData, setFormData] = useState({
    company_name: "",
    business_type: "",
    business_description: "",
    site_expectations: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
    twitter: "",
    business_email: "",
    phone_landline: "",
    business_hours: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    show_address: true,
    has_domain: "no",
    domain_name: "",
    domain_provider: "",
    domain_config_status: "",
    has_logo: "no",
    preferred_color: "",
    logo_description: "",
    // Migration fields
    migration_current_domain: "",
    migration_current_host: "",
    migration_site_type: "",
    migration_has_access: "no",
    migration_access_notes: "",
    migration_assistance_level: "full",
  });

  // Fetch existing onboarding data
  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ["client-onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (onboarding?.onboarding_status === "complete") {
      navigate("/cliente/dashboard");
    }
  }, [onboarding, navigate]);

  // Pre-fill form with existing data
  useEffect(() => {
    if (onboarding) {
      setFormData(prev => ({
        ...prev,
        company_name: onboarding.company_name || "",
        business_type: onboarding.business_type || "",
        business_description: onboarding.business_description || "",
        site_expectations: onboarding.site_expectations || "",
        whatsapp: onboarding.whatsapp || "",
        instagram: onboarding.instagram || "",
        facebook: onboarding.facebook || "",
        linkedin: onboarding.linkedin || "",
        youtube: onboarding.youtube || "",
        tiktok: onboarding.tiktok || "",
        twitter: onboarding.twitter || "",
        business_email: onboarding.business_email || "",
        phone_landline: onboarding.phone_landline || "",
        business_hours: onboarding.business_hours || "",
        address_street: onboarding.address_street || "",
        address_number: onboarding.address_number || "",
        address_complement: onboarding.address_complement || "",
        address_neighborhood: onboarding.address_neighborhood || "",
        address_city: onboarding.address_city || "",
        address_state: onboarding.address_state || "",
        address_zip: onboarding.address_zip || "",
        show_address: onboarding.show_address ?? true,
        has_domain: onboarding.has_domain ? "yes" : "no",
        domain_name: onboarding.domain_name || "",
        domain_provider: onboarding.domain_provider || "",
        has_logo: onboarding.has_logo ? "yes" : "no",
        preferred_color: onboarding.preferred_color || "",
        logo_description: onboarding.logo_description || "",
        migration_current_domain: onboarding.migration_current_domain || "",
        migration_current_host: onboarding.migration_current_host || "",
        migration_site_type: onboarding.migration_site_type || "",
        migration_access_notes: onboarding.migration_access_notes || "",
        migration_assistance_level: onboarding.migration_assistance_level || "full",
      }));
      if (onboarding.logo_url) {
        setLogoPreview(onboarding.logo_url);
      }
      if (onboarding.inspiration_urls) {
        setInspirationPreviews(onboarding.inspiration_urls);
      }
    }
  }, [onboarding]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleAddInspiration = (file: File) => {
    setInspirationFiles(prev => [...prev, file]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInspirationPreviews(prev => [...prev, ev.target?.result as string]);
    };
    reader.readAsDataURL(file);
  };

  const removeInspiration = (index: number) => {
    setInspirationFiles(prev => prev.filter((_, i) => i !== index));
    setInspirationPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !onboarding) return;
    
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.company_name.trim()) {
        toast.error("Nome da empresa é obrigatório");
        setCurrentStep(1);
        setIsSubmitting(false);
        return;
      }
      if (!formData.business_type) {
        toast.error("Selecione o ramo de atuação");
        setCurrentStep(1);
        setIsSubmitting(false);
        return;
      }
      // Validate WhatsApp
      if (!validateWhatsApp(formData.whatsapp)) {
        toast.error("WhatsApp inválido. Verifique o número informado.");
        setCurrentStep(2);
        setIsSubmitting(false);
        return;
      }

      let logoUrl = onboarding.logo_url;

      // Upload logo if provided
      if (logoFile && formData.has_logo === "yes") {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("client-logos")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("client-logos")
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      // Upload inspiration files
      let inspirationUrls: string[] = onboarding.inspiration_urls || [];
      if (onboarding.needs_brand_creation && inspirationFiles.length > 0) {
        for (const file of inspirationFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}/inspirations/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("client-logos")
            .upload(fileName, file);
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("client-logos")
              .getPublicUrl(fileName);
            inspirationUrls.push(urlData.publicUrl);
          }
        }
      }

      // Update onboarding data
      const { error: updateError } = await supabase
        .from("client_onboarding")
        .update({
          company_name: formData.company_name.trim(),
          business_type: formData.business_type,
          business_description: formData.business_description.trim() || null,
          site_expectations: formData.site_expectations.trim() || null,
          whatsapp: formData.whatsapp.replace(/\D/g, ""), // Store only digits
          instagram: formData.instagram.trim() || null,
          facebook: formData.facebook.trim() || null,
          linkedin: formData.linkedin.trim() || null,
          youtube: formData.youtube.trim() || null,
          tiktok: formData.tiktok.trim() || null,
          twitter: formData.twitter.trim() || null,
          business_email: formData.business_email.trim() || null,
          phone_landline: formData.phone_landline.trim() || null,
          business_hours: formData.business_hours.trim() || null,
          address_street: formData.address_street.trim() || null,
          address_number: formData.address_number.trim() || null,
          address_complement: formData.address_complement.trim() || null,
          address_neighborhood: formData.address_neighborhood.trim() || null,
          address_city: formData.address_city.trim() || null,
          address_state: formData.address_state || null,
          address_zip: formData.address_zip.trim() || null,
          show_address: formData.show_address,
          has_domain: formData.has_domain === "yes",
          domain_name: formData.has_domain === "yes" ? formData.domain_name.trim() : null,
          domain_provider: formData.has_domain === "yes" ? formData.domain_provider : null,
          has_logo: formData.has_logo === "yes",
          logo_url: logoUrl,
          preferred_color: onboarding.needs_brand_creation ? formData.preferred_color.trim() || null : null,
          logo_description: onboarding.needs_brand_creation ? formData.logo_description.trim() || null : null,
          inspiration_urls: inspirationUrls.length > 0 ? inspirationUrls : null,
          has_brand_identity: formData.has_logo === "yes",
          // Migration fields
          migration_current_domain: onboarding.needs_migration ? formData.migration_current_domain.trim() || null : null,
          migration_current_host: onboarding.needs_migration ? formData.migration_current_host : null,
          migration_site_type: onboarding.needs_migration ? formData.migration_site_type : null,
          migration_has_access: onboarding.needs_migration ? formData.migration_has_access === "yes" : null,
          migration_access_notes: onboarding.needs_migration && formData.migration_assistance_level === "partial" ? formData.migration_access_notes.trim() || null : null,
          migration_assistance_level: onboarding.needs_migration ? formData.migration_assistance_level : null,
          // Mark as complete
          onboarding_status: "complete",
        })
        .eq("id", onboarding.id);

      if (updateError) throw updateError;

      // If migration is requested, create a migration_request entry and notify admins
      if (onboarding.needs_migration && formData.migration_current_domain) {
        const { data: newMigrationData, error: migrationError } = await supabase
          .from("migration_requests")
          .insert({
            name: formData.company_name.trim(),
            email: user.email || "",
            whatsapp: formData.whatsapp.replace(/\D/g, ""),
            current_domain: formData.migration_current_domain.trim(),
            current_host: formData.migration_current_host || null,
            site_type: formData.migration_site_type || "wordpress",
            additional_info: formData.migration_access_notes?.trim() || null,
            status: "pending",
          })
          .select("id")
          .single();

        if (!migrationError && newMigrationData) {
          try {
            await notifyAllAdminsMigrationRequest(
              formData.company_name.trim(),
              formData.company_name.trim(),
              formData.migration_current_domain.trim(),
              newMigrationData.id,
              formData.migration_site_type,
              formData.migration_assistance_level
            );
          } catch (notifyError) {
            console.error("Error notifying admins about migration:", notifyError);
          }
        }
      }

      // Log audit action
      await logAction({
        actionType: 'update',
        entityType: 'client',
        entityId: onboarding.id,
        entityName: formData.company_name.trim(),
        description: `Onboarding completo: ${formData.company_name.trim()}`,
        newValue: {
          company_name: formData.company_name.trim(),
          business_type: formData.business_type,
          onboarding_status: "complete",
        },
      });

      toast.success("Cadastro concluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-onboarding"] });
      navigate("/cliente/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/cliente");
    return null;
  }

  if (!onboarding) {
    return (
      <ClientLayout title="Complete seu cadastro">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">
            Nenhum onboarding pendente encontrado.
          </p>
          <Button onClick={() => navigate("/cliente/dashboard")} className="mt-4">
            Ir para Dashboard
          </Button>
        </div>
      </ClientLayout>
    );
  }

  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <ClientLayout 
      title="Complete seu cadastro" 
      subtitle="Preencha as informações do seu projeto para começarmos"
    >
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Etapa {currentStep} de {totalSteps}</span>
            <span>{Math.round(progressPercent)}% completo</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Company Identity */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Identidade da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da empresa *</Label>
                  <Input
                    id="company_name"
                    placeholder="Nome da sua empresa ou projeto"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange("company_name", e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Ramo de atuação *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => handleInputChange("business_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ramo de atuação" />
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
                  <Label htmlFor="business_description">
                    Descreva seu negócio (opcional)
                  </Label>
                  <Textarea
                    id="business_description"
                    placeholder="Conte um pouco sobre o que sua empresa faz..."
                    value={formData.business_description}
                    onChange={(e) => handleInputChange("business_description", e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_expectations">
                    O que você espera do seu novo site? (opcional)
                  </Label>
                  <Textarea
                    id="site_expectations"
                    placeholder="Ex: Quero que meus clientes possam agendar horários online..."
                    value={formData.site_expectations}
                    onChange={(e) => handleInputChange("site_expectations", e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Contact & Social */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contato e Redes Sociais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* WhatsApp - Required field */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-1">
                    WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="(00) 00000-0000"
                    value={formatWhatsApp(formData.whatsapp)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                      handleInputChange("whatsapp", value);
                      if (whatsappError) validateWhatsApp(value);
                    }}
                    onBlur={() => validateWhatsApp(formData.whatsapp)}
                    className={whatsappError ? "border-destructive" : ""}
                  />
                  {whatsappError && (
                    <p className="text-sm text-destructive">{whatsappError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Número usado para comunicação sobre seu projeto
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_email">Email comercial</Label>
                    <Input
                      id="business_email"
                      type="email"
                      placeholder="contato@suaempresa.com.br"
                      value={formData.business_email}
                      onChange={(e) => handleInputChange("business_email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_landline">Telefone fixo</Label>
                    <Input
                      id="phone_landline"
                      placeholder="(00) 0000-0000"
                      value={formData.phone_landline}
                      onChange={(e) => handleInputChange("phone_landline", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_hours">Horário de funcionamento</Label>
                  <Input
                    id="business_hours"
                    placeholder="Seg-Sex: 8h às 18h | Sáb: 8h às 12h"
                    value={formData.business_hours}
                    onChange={(e) => handleInputChange("business_hours", e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t space-y-3">
                  <Label className="text-sm font-medium">Redes Sociais (opcional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="@instagram"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange("instagram", e.target.value)}
                    />
                    <Input
                      placeholder="facebook.com/pagina"
                      value={formData.facebook}
                      onChange={(e) => handleInputChange("facebook", e.target.value)}
                    />
                    <Input
                      placeholder="linkedin.com/company/empresa"
                      value={formData.linkedin}
                      onChange={(e) => handleInputChange("linkedin", e.target.value)}
                    />
                    <Input
                      placeholder="@youtube"
                      value={formData.youtube}
                      onChange={(e) => handleInputChange("youtube", e.target.value)}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_address"
                      checked={formData.show_address}
                      onCheckedChange={(checked) => handleInputChange("show_address", checked as boolean)}
                    />
                    <Label htmlFor="show_address" className="font-normal cursor-pointer flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Quero exibir endereço no site
                    </Label>
                  </div>

                  {formData.show_address && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Rua/Avenida"
                        value={formData.address_street}
                        onChange={(e) => handleInputChange("address_street", e.target.value)}
                      />
                      <Input
                        placeholder="Número"
                        value={formData.address_number}
                        onChange={(e) => handleInputChange("address_number", e.target.value)}
                      />
                      <Input
                        placeholder="Complemento"
                        value={formData.address_complement}
                        onChange={(e) => handleInputChange("address_complement", e.target.value)}
                      />
                      <Input
                        placeholder="Bairro"
                        value={formData.address_neighborhood}
                        onChange={(e) => handleInputChange("address_neighborhood", e.target.value)}
                      />
                      <Input
                        placeholder="Cidade"
                        value={formData.address_city}
                        onChange={(e) => handleInputChange("address_city", e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Select
                          value={formData.address_state}
                          onValueChange={(value) => handleInputChange("address_state", value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="CEP"
                          value={formData.address_zip}
                          onChange={(e) => handleInputChange("address_zip", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Domain & Branding */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Domínio e Identidade Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Domain */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Você já possui um domínio?</Label>
                  <RadioGroup
                    value={formData.has_domain}
                    onValueChange={(value) => handleInputChange("has_domain", value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="domain-yes" />
                      <Label htmlFor="domain-yes" className="cursor-pointer">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="domain-no" />
                      <Label htmlFor="domain-no" className="cursor-pointer">Não</Label>
                    </div>
                  </RadioGroup>

                  {formData.has_domain === "yes" && (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                      <Input
                        placeholder="www.seudominio.com.br"
                        value={formData.domain_name}
                        onChange={(e) => handleInputChange("domain_name", e.target.value)}
                      />
                      <Select
                        value={formData.domain_provider}
                        onValueChange={(value) => handleInputChange("domain_provider", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Onde está registrado?" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainProviders.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.has_domain === "no" && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        <Check className="h-4 w-4 inline mr-1" />
                        Nossa equipe ajudará você a registrar seu domínio!
                      </p>
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Logomarca
                  </Label>
                  <RadioGroup
                    value={formData.has_logo}
                    onValueChange={(value) => handleInputChange("has_logo", value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="logo-yes" />
                      <Label htmlFor="logo-yes" className="cursor-pointer">Já tenho</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="logo-no" />
                      <Label htmlFor="logo-no" className="cursor-pointer">Ainda não</Label>
                    </div>
                  </RadioGroup>

                  {formData.has_logo === "yes" && (
                    <div className="space-y-3">
                      {logoPreview ? (
                        <div className="relative inline-block">
                          <img src={logoPreview} alt="Logo" className="h-24 w-auto rounded-lg border" />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Enviar logo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Brand creation fields */}
                  {formData.has_logo === "no" && onboarding.needs_brand_creation && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 text-primary">
                        <Palette className="h-5 w-5" />
                        <span className="font-medium">Criação de Marca contratada</span>
                      </div>
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Descreva como imagina sua logomarca..."
                          value={formData.logo_description}
                          onChange={(e) => handleInputChange("logo_description", e.target.value)}
                          rows={3}
                        />
                        <Input
                          placeholder="Cores de preferência (ex: tons de azul)"
                          value={formData.preferred_color}
                          onChange={(e) => handleInputChange("preferred_color", e.target.value)}
                        />
                        <div>
                          <Label className="text-sm mb-2 block">Referências visuais</Label>
                          <ImageUploadGrid
                            images={inspirationFiles}
                            previews={inspirationPreviews}
                            onAdd={handleAddInspiration}
                            onRemove={removeInspiration}
                            maxImages={3}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Migration (if needed) */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  {onboarding.needs_migration ? "Detalhes da Migração" : "Finalize seu cadastro"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {onboarding.needs_migration ? (
                  <>
                    <div className="space-y-2">
                      <Label>Domínio do site atual</Label>
                      <Input
                        placeholder="www.seusite.com.br"
                        value={formData.migration_current_domain}
                        onChange={(e) => handleInputChange("migration_current_domain", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Onde está hospedado?</Label>
                      <Select
                        value={formData.migration_current_host}
                        onValueChange={(value) => handleInputChange("migration_current_host", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a hospedagem" />
                        </SelectTrigger>
                        <SelectContent>
                          {migrationHosts.map((h) => (
                            <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo do site</Label>
                      <RadioGroup
                        value={formData.migration_site_type}
                        onValueChange={(value) => handleInputChange("migration_site_type", value)}
                        className="grid grid-cols-2 gap-2"
                      >
                        {migrationSiteTypes.map((t) => (
                          <div key={t.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={t.value} id={`type-${t.value}`} />
                            <Label htmlFor={`type-${t.value}`} className="cursor-pointer">{t.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label>Como prefere o processo de migração?</Label>
                      <RadioGroup
                        value={formData.migration_assistance_level}
                        onValueChange={(value) => handleInputChange("migration_assistance_level", value)}
                        className="space-y-2"
                      >
                        <Label
                          htmlFor="assist-full"
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                            formData.migration_assistance_level === "full" ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <RadioGroupItem value="full" id="assist-full" className="mt-1" />
                          <div>
                            <span className="font-medium flex items-center gap-2">
                              <Headphones className="h-4 w-4 text-primary" />
                              Assistência completa
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Nossa equipe cuida de tudo para você
                            </p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="assist-partial"
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                            formData.migration_assistance_level === "partial" ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <RadioGroupItem value="partial" id="assist-partial" className="mt-1" />
                          <div>
                            <span className="font-medium flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              Vou fornecer as credenciais
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tenho acesso ao painel e posso fornecer os dados
                            </p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Tudo pronto!</h3>
                    <p className="text-muted-foreground">
                      Clique em "Finalizar cadastro" para começarmos a criar seu projeto.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between gap-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                Continuar
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar cadastro
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </ClientLayout>
  );
}