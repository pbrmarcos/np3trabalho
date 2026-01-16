import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Plus, X } from "lucide-react";

interface PlanConfig {
  name: string;
  price: number;
  price_id: string;
  product_id: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PlansConfigFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

export default function PlansConfigForm({ settings, onSave, isSaving }: PlansConfigFormProps) {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({
    plan_basic: { name: '', price: 0, price_id: '', product_id: '', description: '', features: [] },
    plan_professional: { name: '', price: 0, price_id: '', product_id: '', description: '', features: [], popular: true },
    plan_performance: { name: '', price: 0, price_id: '', product_id: '', description: '', features: [] },
  });

  useEffect(() => {
    if (settings) {
      setPlans({
        plan_basic: settings.plan_basic?.value || plans.plan_basic,
        plan_professional: settings.plan_professional?.value || plans.plan_professional,
        plan_performance: settings.plan_performance?.value || plans.plan_performance,
      });
    }
  }, [settings]);

  const updatePlan = (key: string, field: keyof PlanConfig, value: any) => {
    setPlans(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const updateFeature = (planKey: string, index: number, value: string) => {
    setPlans(prev => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        features: prev[planKey].features.map((f, i) => i === index ? value : f)
      }
    }));
  };

  const addFeature = (planKey: string) => {
    setPlans(prev => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        features: [...prev[planKey].features, '']
      }
    }));
  };

  const removeFeature = (planKey: string, index: number) => {
    setPlans(prev => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        features: prev[planKey].features.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = (key: string) => {
    onSave(key, plans[key]);
  };

  const planLabels: Record<string, string> = {
    plan_basic: 'Plano Essencial',
    plan_professional: 'Plano Profissional',
    plan_performance: 'Plano Performance',
  };

  return (
    <div className="grid gap-6">
      {Object.entries(plans).map(([key, plan]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-lg">{planLabels[key]}</CardTitle>
            <CardDescription>Configure os detalhes e preços deste plano</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${key}-name`}>Nome do Plano</Label>
                <Input
                  id={`${key}-name`}
                  value={plan.name}
                  onChange={(e) => updatePlan(key, 'name', e.target.value)}
                  placeholder="Ex: Essencial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${key}-price`}>Preço (R$/mês)</Label>
                <Input
                  id={`${key}-price`}
                  type="number"
                  value={plan.price}
                  onChange={(e) => updatePlan(key, 'price', Number(e.target.value))}
                  placeholder="149"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${key}-description`}>Descrição</Label>
              <Input
                id={`${key}-description`}
                value={plan.description}
                onChange={(e) => updatePlan(key, 'description', e.target.value)}
                placeholder="Para quem está começando"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${key}-product_id`}>Stripe Product ID</Label>
              <Input
                id={`${key}-product_id`}
                value={plan.product_id}
                onChange={(e) => updatePlan(key, 'product_id', e.target.value)}
                placeholder="prod_xxxxx"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Os Price IDs por período são configurados na seção "Integrações → Stripe"
              </p>
            </div>

            {key === 'plan_professional' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={`${key}-popular`}
                  checked={plan.popular || false}
                  onCheckedChange={(checked) => updatePlan(key, 'popular', checked)}
                />
                <Label htmlFor={`${key}-popular`}>Marcar como "Mais Popular"</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Features (recursos inclusos)</Label>
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(key, index, e.target.value)}
                      placeholder="Ex: Hospedagem inclusa"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFeature(key, index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFeature(key)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Feature
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => handleSave(key)} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar {planLabels[key]}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
