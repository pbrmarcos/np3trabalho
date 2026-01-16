import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Save, Loader2, Bell, Volume2, VolumeX, Play } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  useNotificationSoundConfig, 
  useNotificationSound,
  NotificationType,
  SoundStyle,
  soundLabels,
  typeLabels
} from "@/hooks/useNotificationSound";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CookiePrivacyCard } from "@/components/CookiePrivacyCard";

export default function ClientAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { config, updateConfig, updateTypeConfig } = useNotificationSoundConfig();
  const { testSound } = useNotificationSound();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company_name: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        company_name: profile.company_name || "",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: data.full_name,
            phone: data.phone,
            company_name: data.company_name,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user?.id,
          full_name: data.full_name,
          phone: data.phone,
          company_name: data.company_name,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Dados salvos",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao atualizar suas informações. Tente novamente.",
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
    { label: "Minha Conta" }
  ];

  // Filter notification types relevant to clients
  const clientNotificationTypes: NotificationType[] = ['ticket', 'file', 'brand', 'design', 'message', 'payment'];

  return (
    <ClientLayout breadcrumbs={breadcrumbs}>
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Minha Conta
              </CardTitle>
              <CardDescription>
                Gerencie suas informações de contato e perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O e-mail não pode ser alterado.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome da empresa</Label>
                    <Input
                      id="company_name"
                      type="text"
                      placeholder="Nome da sua empresa"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                      }
                    />
                  </div>

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
            </CardContent>
          </Card>

          {/* Notification Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure suas preferências de notificação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {config.globalEnabled ? (
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="notification-sound" className="font-medium">
                      Som de notificação
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar sons de notificação
                    </p>
                  </div>
                </div>
                <Switch
                  id="notification-sound"
                  checked={config.globalEnabled}
                  onCheckedChange={(globalEnabled) => updateConfig({ globalEnabled })}
                />
              </div>

              {/* Per-type Configuration */}
              {config.globalEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-medium">Sons por tipo de notificação</Label>
                  
                  {clientNotificationTypes.map((type) => {
                    const typeConfig = config.types[type];
                    return (
                      <div key={type} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Switch
                          checked={typeConfig.enabled}
                          onCheckedChange={(enabled) => updateTypeConfig(type, { enabled })}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{typeLabels[type]}</p>
                        </div>
                        <Select
                          value={typeConfig.style}
                          onValueChange={(style: SoundStyle) => updateTypeConfig(type, { style })}
                          disabled={!typeConfig.enabled}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(soundLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => testSound(typeConfig.style)}
                          disabled={!typeConfig.enabled}
                          className="shrink-0"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Privacy & Cookies Card */}
          <CookiePrivacyCard />
        </div>
      </div>
    </ClientLayout>
  );
}