import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Users, Palette, Globe, CheckCircle, XCircle, ExternalLink, Image } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingRecord {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  business_description: string | null;
  whatsapp: string;
  instagram: string | null;
  has_domain: boolean;
  domain_name: string | null;
  has_logo: boolean;
  logo_url: string | null;
  needs_brand_creation: boolean;
  preferred_color: string | null;
  logo_description: string | null;
  inspiration_urls: string[] | null;
  selected_plan: string;
  brand_creation_paid: boolean;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BrandCreationConfig {
  price: number;
  stripe_price_id: string;
  included: string;
}

interface OnboardingConfigFormProps {
  settings: Record<string, any> | undefined;
}

const businessTypeLabels: Record<string, string> = {
  advogado: "Advogado / Jurídico",
  saude: "Saúde / Clínica",
  construcao: "Construção",
  restaurante: "Restaurante",
  beleza: "Beleza / Estética",
  educacao: "Educação",
  outro: "Outro",
};

const planLabels: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  performance: "Performance",
};

export default function OnboardingConfigForm({ settings }: OnboardingConfigFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedOnboarding, setSelectedOnboarding] = useState<OnboardingRecord | null>(null);
  
  // Brand creation config state
  const [brandConfig, setBrandConfig] = useState<BrandCreationConfig>({
    price: 150,
    stripe_price_id: "",
    included: "2 versões de logomarca + 2 rodadas de correções"
  });
  const [isSavingBrandConfig, setIsSavingBrandConfig] = useState(false);

  // Load brand creation config from settings
  useEffect(() => {
    if (settings?.brand_creation_config?.value) {
      const config = settings.brand_creation_config.value as BrandCreationConfig;
      setBrandConfig({
        price: config.price || 150,
        stripe_price_id: config.stripe_price_id || "",
        included: config.included || "2 versões de logomarca + 2 rodadas de correções"
      });
    }
  }, [settings]);

  const { data: onboardings, isLoading } = useQuery({
    queryKey: ["admin-onboardings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OnboardingRecord[];
    },
  });

  const updateBrandStatusMutation = useMutation({
    mutationFn: async ({ id, brand_creation_paid }: { id: string; brand_creation_paid: boolean }) => {
      const { error } = await supabase
        .from("client_onboarding")
        .update({ brand_creation_paid })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-onboardings"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleSaveBrandConfig = async () => {
    setIsSavingBrandConfig(true);
    try {
      const configValue = {
        price: brandConfig.price,
        stripe_price_id: brandConfig.stripe_price_id,
        included: brandConfig.included
      };
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: configValue,
          updated_by: user?.id 
        })
        .eq("key", "brand_creation_config");

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Configurações de marca salvas!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSavingBrandConfig(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Onboardings Recebidos
          </CardTitle>
          <CardDescription>
            Visualize e gerencie os dados de onboarding dos clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!onboardings || onboardings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum onboarding recebido ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {onboardings.map((onboarding) => (
                <Card
                  key={onboarding.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedOnboarding?.id === onboarding.id ? "border-primary" : ""
                  }`}
                  onClick={() =>
                    setSelectedOnboarding(
                      selectedOnboarding?.id === onboarding.id ? null : onboarding
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {onboarding.company_name}
                          </h4>
                          <Badge variant="outline">
                            {planLabels[onboarding.selected_plan] || onboarding.selected_plan}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {businessTypeLabels[onboarding.business_type] || onboarding.business_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(onboarding.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {onboarding.needs_brand_creation && (
                          <Badge
                            variant={onboarding.brand_creation_paid ? "default" : "secondary"}
                            className={
                              onboarding.brand_creation_paid
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                            }
                          >
                            <Palette className="h-3 w-3 mr-1" />
                            Marca {onboarding.brand_creation_paid ? "Paga" : "Pendente"}
                          </Badge>
                        )}
                        {onboarding.has_logo && (
                          <Badge variant="outline" className="text-xs">
                            Logo enviada
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedOnboarding?.id === onboarding.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Contact */}
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase">Contato</Label>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">WhatsApp:</span>{" "}
                                {onboarding.whatsapp}
                              </p>
                              {onboarding.instagram && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Instagram:</span>{" "}
                                  {onboarding.instagram}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Domain */}
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase">Domínio</Label>
                            <div className="flex items-center gap-2">
                              {onboarding.has_domain ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm">{onboarding.domain_name}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Não possui</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {onboarding.business_description && (
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-muted-foreground text-xs uppercase">
                                Descrição
                              </Label>
                              <p className="text-sm bg-muted/50 p-3 rounded">
                                {onboarding.business_description}
                              </p>
                            </div>
                          )}

                          {/* Logo */}
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase">Logo</Label>
                            {onboarding.has_logo && onboarding.logo_url ? (
                              <a
                                href={onboarding.logo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block"
                              >
                                <img
                                  src={onboarding.logo_url}
                                  alt="Logo"
                                  className="h-16 w-auto rounded border hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ) : onboarding.needs_brand_creation ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Palette className="h-4 w-4 text-primary" />
                                  <span className="text-sm">Criação de marca solicitada</span>
                                </div>
                                {onboarding.preferred_color && (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Cor preferida:</span> {onboarding.preferred_color}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Não possui</span>
                            )}
                          </div>

                          {/* Logo Description - NEW */}
                          {onboarding.needs_brand_creation && onboarding.logo_description && (
                            <div className="space-y-2">
                              <Label className="text-muted-foreground text-xs uppercase">
                                Descrição do Logo Desejado
                              </Label>
                              <p className="text-sm bg-muted/50 p-3 rounded">
                                {onboarding.logo_description}
                              </p>
                            </div>
                          )}

                          {/* Inspiration URLs - NEW */}
                          {onboarding.needs_brand_creation && onboarding.inspiration_urls && onboarding.inspiration_urls.length > 0 && (
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-muted-foreground text-xs uppercase flex items-center gap-2">
                                <Image className="h-4 w-4" />
                                Imagens de Inspiração ({onboarding.inspiration_urls.length})
                              </Label>
                              <div className="grid grid-cols-3 gap-2">
                                {onboarding.inspiration_urls.map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <img
                                      src={url}
                                      alt={`Inspiração ${index + 1}`}
                                      className="w-full h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Brand Status Toggle */}
                          {onboarding.needs_brand_creation && (
                            <div className="space-y-2">
                              <Label className="text-muted-foreground text-xs uppercase">
                                Status da Marca
                              </Label>
                              <Button
                                variant={onboarding.brand_creation_paid ? "outline" : "default"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBrandStatusMutation.mutate({
                                    id: onboarding.id,
                                    brand_creation_paid: !onboarding.brand_creation_paid,
                                  });
                                }}
                                disabled={updateBrandStatusMutation.isPending}
                              >
                                {updateBrandStatusMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : onboarding.brand_creation_paid ? (
                                  "Marcar como Pendente"
                                ) : (
                                  "Marcar como Paga"
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Creation Price Config - NOW EDITABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuração de Criação de Marca
          </CardTitle>
          <CardDescription>
            Configure o preço e detalhes do serviço de criação de identidade visual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-price">Preço (R$)</Label>
              <Input 
                id="brand-price"
                type="number"
                value={brandConfig.price}
                onChange={(e) => setBrandConfig(prev => ({ 
                  ...prev, 
                  price: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-price-id">Stripe Price ID</Label>
              <Input 
                id="stripe-price-id"
                value={brandConfig.stripe_price_id}
                onChange={(e) => setBrandConfig(prev => ({ 
                  ...prev, 
                  stripe_price_id: e.target.value 
                }))}
                placeholder="price_..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-included">O que está incluso</Label>
            <Input 
              id="brand-included"
              value={brandConfig.included}
              onChange={(e) => setBrandConfig(prev => ({ 
                ...prev, 
                included: e.target.value 
              }))}
              placeholder="Ex: 2 versões de logomarca + 2 rodadas de correções"
            />
          </div>
          <Button 
            onClick={handleSaveBrandConfig}
            disabled={isSavingBrandConfig}
            className="w-full sm:w-auto"
          >
            {isSavingBrandConfig ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
