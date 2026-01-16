import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Save, Loader2, Bell, Volume2, VolumeX, Play, Ticket, FileText, Palette, MoreHorizontal, Package, MessageCircle, FolderOpen, CreditCard } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useNotificationSoundConfig,
  useNotificationSound,
  soundLabels,
  typeLabels,
  NotificationType,
  SoundStyle,
} from "@/hooks/useNotificationSound";

const typeIcons: Record<NotificationType, React.ReactNode> = {
  ticket: <Ticket className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  brand: <Palette className="h-4 w-4" />,
  design: <Package className="h-4 w-4" />,
  message: <MessageCircle className="h-4 w-4" />,
  project: <FolderOpen className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  default: <MoreHorizontal className="h-4 w-4" />,
};

export default function AdminAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { config, updateConfig, updateTypeConfig } = useNotificationSoundConfig();
  const { testSound } = useNotificationSound();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
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
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user?.id,
          full_name: data.full_name,
          phone: data.phone,
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
    { label: "Dashboard", href: "/admin" },
    { label: "Minha Conta" }
  ];

  const notificationTypes: NotificationType[] = ["ticket", "file", "brand", "design", "message", "project", "payment", "default"];
  const soundStyles: SoundStyle[] = ["chime", "bell", "pop", "ding", "soft", "alert"];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Minha Conta
            </CardTitle>
            <CardDescription>
              Gerencie suas informações de perfil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
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
                  <Label htmlFor="phone">Telefone</Label>
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
              Sons de Notificação
            </CardTitle>
            <CardDescription>
              Configure sons diferentes para cada tipo de notificação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                {config.globalEnabled ? (
                  <Volume2 className="h-5 w-5 text-primary" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="global-sound" className="font-medium">
                    Ativar sons de notificação
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Controle global para todos os sons
                  </p>
                </div>
              </div>
              <Switch
                id="global-sound"
                checked={config.globalEnabled}
                onCheckedChange={(enabled) => updateConfig({ globalEnabled: enabled })}
              />
            </div>

            {/* Per-type configuration */}
            {config.globalEnabled && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Configuração por tipo</Label>
                
                {notificationTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className="text-muted-foreground">{typeIcons[type]}</span>
                      <span className="font-medium text-sm">{typeLabels[type]}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      <Switch
                        checked={config.types[type]?.enabled ?? true}
                        onCheckedChange={(enabled) =>
                          updateTypeConfig(type, { enabled })
                        }
                        disabled={!config.globalEnabled}
                      />

                      <Select
                        value={config.types[type]?.style ?? "chime"}
                        onValueChange={(style: SoundStyle) =>
                          updateTypeConfig(type, { style })
                        }
                        disabled={!config.globalEnabled || !config.types[type]?.enabled}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {soundStyles.map((style) => (
                            <SelectItem key={style} value={style}>
                              {soundLabels[style]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => testSound(config.types[type]?.style ?? "chime")}
                        disabled={!config.globalEnabled || !config.types[type]?.enabled}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Testar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sound preview section */}
            {config.globalEnabled && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Ouvir todos os sons</Label>
                <div className="flex flex-wrap gap-2">
                  {soundStyles.map((style) => (
                    <Button
                      key={style}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => testSound(style)}
                    >
                      <Play className="h-3 w-3" />
                      {soundLabels[style]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminLayoutWithSidebar>
  );
}
