import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save, Clock, Palette, Ticket, RefreshCw, AlertCircle, Globe } from "lucide-react";

export interface SLAConfig {
  design_new: {
    enabled: boolean;
    usePackageEstimate: boolean;
    defaultDays: number;
  };
  design_revision: {
    enabled: boolean;
    percentOfOriginal: number;
    minHours: number;
  };
  ticket: {
    enabled: boolean;
    urgent: number; // hours
    high: number;
    medium: number;
    low: number;
  };
  migration: {
    enabled: boolean;
    defaultDays: number;
  };
  notifications: {
    enabled: boolean;
    warningPercent: number; // Notify when X% of time remaining
    soundEnabled: boolean;
    toastEnabled: boolean;
  };
}

const defaultConfig: SLAConfig = {
  design_new: {
    enabled: true,
    usePackageEstimate: true,
    defaultDays: 5,
  },
  design_revision: {
    enabled: true,
    percentOfOriginal: 50,
    minHours: 24,
  },
  ticket: {
    enabled: true,
    urgent: 6,
    high: 12,
    medium: 24,
    low: 48,
  },
  migration: {
    enabled: true,
    defaultDays: 3,
  },
  notifications: {
    enabled: true,
    warningPercent: 25,
    soundEnabled: true,
    toastEnabled: true,
  },
};

interface SLAConfigFormProps {
  settings: Record<string, any> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function SLAConfigForm({ settings, onSave, isSaving }: SLAConfigFormProps) {
  const [config, setConfig] = useState<SLAConfig>(defaultConfig);

  useEffect(() => {
    if (settings?.sla_config?.value) {
      setConfig({ ...defaultConfig, ...settings.sla_config.value });
    }
  }, [settings]);

  const handleSave = () => {
    onSave('sla_config', config);
  };

  const updateConfig = (path: string, value: any) => {
    const keys = path.split('.');
    setConfig(prev => {
      const newConfig = { ...prev };
      let current: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      {/* Design New Orders */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Palette className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base">Novos Pedidos de Design</CardTitle>
                <CardDescription>Prazo para produção inicial</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.design_new.enabled}
              onCheckedChange={(v) => updateConfig('design_new.enabled', v)}
            />
          </div>
        </CardHeader>
        {config.design_new.enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="usePackageEstimate"
                checked={config.design_new.usePackageEstimate}
                onCheckedChange={(v) => updateConfig('design_new.usePackageEstimate', v)}
              />
              <Label htmlFor="usePackageEstimate" className="text-sm">
                Usar prazo estimado do pacote (estimated_days)
              </Label>
            </div>
            
            {!config.design_new.usePackageEstimate && (
              <div className="space-y-2">
                <Label>Prazo padrão (dias)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.design_new.defaultDays]}
                    onValueChange={([v]) => updateConfig('design_new.defaultDays', v)}
                    min={1}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {config.design_new.defaultDays} dias
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Design Revisions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <RefreshCw className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-base">Revisões de Design</CardTitle>
                <CardDescription>Prazo para correções solicitadas</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.design_revision.enabled}
              onCheckedChange={(v) => updateConfig('design_revision.enabled', v)}
            />
          </div>
        </CardHeader>
        {config.design_revision.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Percentual do prazo original (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.design_revision.percentOfOriginal]}
                  onValueChange={([v]) => updateConfig('design_revision.percentOfOriginal', v)}
                  min={10}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">
                  {config.design_revision.percentOfOriginal}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: Se o pedido original tinha 10 dias, a revisão terá {Math.round(10 * config.design_revision.percentOfOriginal / 100)} dias.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tempo mínimo (horas)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.design_revision.minHours]}
                  onValueChange={([v]) => updateConfig('design_revision.minHours', v)}
                  min={4}
                  max={72}
                  step={4}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">
                  {config.design_revision.minHours}h
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Ticket className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Tickets de Suporte</CardTitle>
                <CardDescription>SLA por prioridade</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.ticket.enabled}
              onCheckedChange={(v) => updateConfig('ticket.enabled', v)}
            />
          </div>
        </CardHeader>
        {config.ticket.enabled && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-red-500">Urgente (horas)</Label>
                <Input
                  type="number"
                  value={config.ticket.urgent}
                  onChange={(e) => updateConfig('ticket.urgent', parseInt(e.target.value) || 1)}
                  min={1}
                  max={168}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-500">Alta (horas)</Label>
                <Input
                  type="number"
                  value={config.ticket.high}
                  onChange={(e) => updateConfig('ticket.high', parseInt(e.target.value) || 1)}
                  min={1}
                  max={168}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-500">Média (horas)</Label>
                <Input
                  type="number"
                  value={config.ticket.medium}
                  onChange={(e) => updateConfig('ticket.medium', parseInt(e.target.value) || 1)}
                  min={1}
                  max={168}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Baixa (horas)</Label>
                <Input
                  type="number"
                  value={config.ticket.low}
                  onChange={(e) => updateConfig('ticket.low', parseInt(e.target.value) || 1)}
                  min={1}
                  max={168}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Migrations */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <Globe className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <CardTitle className="text-base">Migrações de Site</CardTitle>
                <CardDescription>Prazo para atendimento de migrações</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.migration?.enabled ?? true}
              onCheckedChange={(v) => updateConfig('migration.enabled', v)}
            />
          </div>
        </CardHeader>
        {config.migration?.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prazo padrão (dias)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.migration?.defaultDays ?? 3]}
                  onValueChange={([v]) => updateConfig('migration.defaultDays', v)}
                  min={1}
                  max={14}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">
                  {config.migration?.defaultDays ?? 3} dias
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Prazo máximo para primeiro contato após solicitação de migração.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Alertas de Prazo</CardTitle>
                <CardDescription>Notificações quando demandas estão vencendo</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.notifications.enabled}
              onCheckedChange={(v) => updateConfig('notifications.enabled', v)}
            />
          </div>
        </CardHeader>
        {config.notifications.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alertar quando restar (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.notifications.warningPercent]}
                  onValueChange={([v]) => updateConfig('notifications.warningPercent', v)}
                  min={5}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20 text-right">
                  {config.notifications.warningPercent}% restante
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: Alertar quando restar menos de {config.notifications.warningPercent}% do tempo total.
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="soundEnabled"
                  checked={config.notifications.soundEnabled}
                  onCheckedChange={(v) => updateConfig('notifications.soundEnabled', v)}
                />
                <Label htmlFor="soundEnabled" className="text-sm">
                  Som de alerta
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="toastEnabled"
                  checked={config.notifications.toastEnabled}
                  onCheckedChange={(v) => updateConfig('notifications.toastEnabled', v)}
                />
                <Label htmlFor="toastEnabled" className="text-sm">
                  Notificação visual
                </Label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Salvando...' : 'Salvar Configurações de SLA'}
      </Button>
    </div>
  );
}
