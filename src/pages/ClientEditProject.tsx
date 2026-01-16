import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Loader2, Phone, Globe, MapPin, RefreshCw, Headphones, HelpCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ClientLayout from "@/components/ClientLayout";

const businessTypes = [
  "Advocacia / Jurídico",
  "Saúde / Medicina",
  "Odontologia",
  "Psicologia / Terapias",
  "Construção Civil",
  "Arquitetura / Design de Interiores",
  "Restaurante / Alimentação",
  "Tecnologia / Software",
  "Contabilidade / Finanças",
  "Imobiliário",
  "Pet / Veterinária",
  "Beleza / Estética",
  "Academia / Fitness",
  "Educação / Cursos",
  "Turismo / Hotelaria",
  "Moda / Vestuário",
  "Varejo / Comércio",
  "Indústria",
  "Consultoria",
  "Marketing / Publicidade",
  "Outro",
];

export default function ClientEditProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    company_name: "",
    business_type: "",
    business_description: "",
    whatsapp: "",
    instagram: "",
    domain_name: "",
    preferred_color: "",
    logo_description: "",
    // New contact fields
    business_email: "",
    phone_landline: "",
    business_hours: "",
    // Address fields
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    show_address: true,
    // Social media
    facebook: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
    twitter: "",
    // Migration fields
    needs_migration: false,
    migration_current_domain: "",
    migration_current_host: "",
    migration_site_type: "",
    migration_has_access: false,
    migration_access_notes: "",
    migration_assistance_level: "",
  });

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["client-onboarding-edit", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        company_name: onboarding.company_name || "",
        business_type: onboarding.business_type || "",
        business_description: onboarding.business_description || "",
        whatsapp: onboarding.whatsapp || "",
        instagram: onboarding.instagram || "",
        domain_name: onboarding.domain_name || "",
        preferred_color: onboarding.preferred_color || "",
        logo_description: onboarding.logo_description || "",
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
        facebook: onboarding.facebook || "",
        linkedin: onboarding.linkedin || "",
        youtube: onboarding.youtube || "",
        tiktok: onboarding.tiktok || "",
        twitter: onboarding.twitter || "",
        needs_migration: onboarding.needs_migration ?? false,
        migration_current_domain: onboarding.migration_current_domain || "",
        migration_current_host: onboarding.migration_current_host || "",
        migration_site_type: onboarding.migration_site_type || "",
        migration_has_access: onboarding.migration_has_access ?? false,
        migration_access_notes: onboarding.migration_access_notes || "",
        migration_assistance_level: onboarding.migration_assistance_level || "",
      });
    }
  }, [onboarding]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!onboarding?.id) throw new Error("Onboarding não encontrado");

      const { error } = await supabase
        .from("client_onboarding")
        .update({
          company_name: data.company_name,
          business_type: data.business_type,
          business_description: data.business_description,
          whatsapp: data.whatsapp,
          instagram: data.instagram,
          domain_name: data.domain_name,
          preferred_color: data.preferred_color,
          logo_description: data.logo_description,
          business_email: data.business_email,
          phone_landline: data.phone_landline,
          business_hours: data.business_hours,
          address_street: data.address_street,
          address_number: data.address_number,
          address_complement: data.address_complement,
          address_neighborhood: data.address_neighborhood,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          show_address: data.show_address,
          facebook: data.facebook,
          linkedin: data.linkedin,
          youtube: data.youtube,
          tiktok: data.tiktok,
          twitter: data.twitter,
          // Migration fields
          needs_migration: data.needs_migration,
          migration_current_domain: data.migration_current_domain || null,
          migration_current_host: data.migration_current_host || null,
          migration_site_type: data.migration_site_type || null,
          migration_has_access: data.migration_has_access,
          migration_access_notes: data.migration_access_notes || null,
          migration_assistance_level: data.migration_assistance_level || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", onboarding.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-onboarding", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["client-onboarding-edit", user?.id] });
      toast({
        title: "Dados salvos",
        description: "As informações do projeto foram atualizadas com sucesso.",
      });
      navigate("/cliente/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao atualizar as informações. Tente novamente.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Editar Projeto" },
  ];

  if (!onboarding && !isLoading) {
    return (
      <ClientLayout
        title="Editar Projeto"
        breadcrumbs={breadcrumbs}
      >
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => navigate("/cliente/dashboard")}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout
      title="Editar Projeto"
      subtitle="Atualize as informações do seu projeto"
      breadcrumbs={breadcrumbs}
    >
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border max-w-3xl mx-auto">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Edição de Informações
        </h3>
        <p className="text-sm text-muted-foreground">
          Atualize os <strong className="text-foreground">dados da sua empresa</strong> e 
          informações de contato. As alterações serão 
          <strong className="text-foreground"> salvas imediatamente</strong> após clicar no botão 
          "Salvar alterações".
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>
                  Informações básicas do seu negócio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da empresa *</Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Nome da sua empresa"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Ramo de atuação *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, business_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ramo" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_description">Descrição do negócio</Label>
                  <Textarea
                    id="business_description"
                    placeholder="Descreva brevemente sua empresa..."
                    value={formData.business_description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, business_description: e.target.value }))
                    }
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.business_description.length}/200
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain_name">Domínio</Label>
                  <Input
                    id="domain_name"
                    type="text"
                    placeholder="www.seusite.com.br"
                    value={formData.domain_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, domain_name: e.target.value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Informações de Contato
                </CardTitle>
                <CardDescription>
                  Contatos que aparecerão no seu site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={formData.whatsapp}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_landline">Telefone fixo</Label>
                    <Input
                      id="phone_landline"
                      type="tel"
                      placeholder="(00) 0000-0000"
                      value={formData.phone_landline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone_landline: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_email">Email comercial</Label>
                    <Input
                      id="business_email"
                      type="email"
                      placeholder="contato@suaempresa.com.br"
                      value={formData.business_email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, business_email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_hours">Horário de funcionamento</Label>
                    <Input
                      id="business_hours"
                      type="text"
                      placeholder="Seg-Sex: 9h-18h"
                      value={formData.business_hours}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, business_hours: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Endereço
                </CardTitle>
                <CardDescription>
                  Endereço físico do seu negócio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="show_address"
                    checked={formData.show_address}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, show_address: checked as boolean }))
                    }
                  />
                  <Label htmlFor="show_address" className="text-sm">
                    Exibir endereço no site
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address_street">Rua / Avenida</Label>
                    <Input
                      id="address_street"
                      type="text"
                      placeholder="Nome da rua"
                      value={formData.address_street}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_street: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_number">Número</Label>
                    <Input
                      id="address_number"
                      type="text"
                      placeholder="123"
                      value={formData.address_number}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_number: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_complement">Complemento</Label>
                    <Input
                      id="address_complement"
                      type="text"
                      placeholder="Sala 101, Bloco A..."
                      value={formData.address_complement}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_complement: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_neighborhood">Bairro</Label>
                    <Input
                      id="address_neighborhood"
                      type="text"
                      placeholder="Nome do bairro"
                      value={formData.address_neighborhood}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_neighborhood: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_city">Cidade</Label>
                    <Input
                      id="address_city"
                      type="text"
                      placeholder="Nome da cidade"
                      value={formData.address_city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_city: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_state">Estado</Label>
                    <Input
                      id="address_state"
                      type="text"
                      placeholder="SC"
                      value={formData.address_state}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_state: e.target.value }))
                      }
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_zip">CEP</Label>
                    <Input
                      id="address_zip"
                      type="text"
                      placeholder="00000-000"
                      value={formData.address_zip}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address_zip: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redes Sociais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Redes Sociais
                </CardTitle>
                <CardDescription>
                  Links para suas redes sociais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      type="text"
                      placeholder="@seuinstagram"
                      value={formData.instagram}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, instagram: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      type="text"
                      placeholder="facebook.com/suapagina"
                      value={formData.facebook}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, facebook: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      type="text"
                      placeholder="linkedin.com/company/suaempresa"
                      value={formData.linkedin}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, linkedin: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      type="text"
                      placeholder="youtube.com/@seucanal"
                      value={formData.youtube}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, youtube: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      type="text"
                      placeholder="@seutiktok"
                      value={formData.tiktok}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tiktok: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X</Label>
                    <Input
                      id="twitter"
                      type="text"
                      placeholder="@seutwitter"
                      value={formData.twitter}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, twitter: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Migration Fields */}
            {onboarding?.needs_migration && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-amber-500" />
                    Migração de Site
                  </CardTitle>
                  <CardDescription>
                    Informações sobre a migração do seu site atual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="migration_current_domain">Domínio atual</Label>
                      <Input
                        id="migration_current_domain"
                        type="text"
                        placeholder="www.seusite.com.br"
                        value={formData.migration_current_domain}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, migration_current_domain: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="migration_current_host">Hospedagem atual</Label>
                      <Select
                        value={formData.migration_current_host}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, migration_current_host: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[
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
                          ].map((host) => (
                            <SelectItem key={host.value} value={host.value}>
                              {host.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="migration_site_type">Tipo de site</Label>
                      <Select
                        value={formData.migration_site_type}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, migration_site_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: "wordpress", label: "WordPress" },
                            { value: "html", label: "HTML/CSS Estático" },
                            { value: "wix", label: "Wix" },
                            { value: "squarespace", label: "Squarespace" },
                            { value: "ecommerce", label: "E-commerce / Loja Virtual" },
                            { value: "outro", label: "Outro" },
                          ].map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nível de assistência</Label>
                      <div className="text-sm">
                        {formData.migration_assistance_level === "full" ? (
                          <span className="flex items-center gap-2 text-primary">
                            <Headphones className="h-4 w-4" />
                            Assistência completa
                          </span>
                        ) : formData.migration_assistance_level === "partial" ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <HelpCircle className="h-4 w-4" />
                            Cliente fornece credenciais
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Não definido</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {formData.migration_assistance_level === "partial" && (
                    <div className="space-y-2">
                      <Label htmlFor="migration_access_notes">Informações de acesso</Label>
                      <Textarea
                        id="migration_access_notes"
                        placeholder="Credenciais de acesso ao painel de hospedagem atual..."
                        value={formData.migration_access_notes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, migration_access_notes: e.target.value }))
                        }
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Suas credenciais são tratadas com total sigilo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Brand Creation Fields */}
            {onboarding?.needs_brand_creation && (
              <Card>
                <CardHeader>
                  <CardTitle>Criação de Marca</CardTitle>
                  <CardDescription>
                    Informações para criação da sua identidade visual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_color">Cores de preferência</Label>
                    <Input
                      id="preferred_color"
                      type="text"
                      placeholder="Ex: Azul e branco, tons terrosos..."
                      value={formData.preferred_color}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, preferred_color: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_description">Descrição da logomarca desejada</Label>
                    <Textarea
                      id="logo_description"
                      placeholder="Descreva como você imagina sua logomarca..."
                      value={formData.logo_description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, logo_description: e.target.value }))
                      }
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.logo_description.length}/500
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar alterações
            </Button>
          </form>
        )}
      </div>
    </ClientLayout>
  );
}
