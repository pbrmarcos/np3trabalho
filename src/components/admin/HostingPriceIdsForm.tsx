import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, RefreshCw, CheckCircle2, CreditCard, Info, AlertCircle, X, Wand2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSettingsChange } from "@/services/auditService";
import type { Json } from "@/integrations/supabase/types";

interface PriceIds {
  monthly: string;
  semester: string;
  annual: string;
  biennial: string;
}

interface HostingPriceIds {
  basic: PriceIds;
  professional: PriceIds;
  performance: PriceIds;
}

interface ValidationResult {
  priceId: string;
  valid: boolean;
  error?: string;
  nickname?: string;
  unitAmount?: number;
  currency?: string;
  recurring?: boolean;
  interval?: string;
  productName?: string;
}

interface HostingPriceIdsFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

const defaultPriceIds: HostingPriceIds = {
  basic: { monthly: '', semester: '', annual: '', biennial: '' },
  professional: { monthly: '', semester: '', annual: '', biennial: '' },
  performance: { monthly: '', semester: '', annual: '', biennial: '' },
};

// Base monthly prices in cents
const basePrices: Record<string, number> = {
  basic: 14900,        // R$ 149
  professional: 29900, // R$ 299
  performance: 44900,  // R$ 449
};

const planLabels: Record<string, string> = {
  basic: 'Essencial',
  professional: 'Profissional',
  performance: 'Performance',
};

const periodConfig: Record<string, { 
  label: string; 
  discount: number; 
  months: number;
  type: 'subscription' | 'one-time';
}> = {
  monthly: { label: 'Mensal', discount: 0, months: 1, type: 'subscription' },
  semester: { label: 'Semestral', discount: 10, months: 6, type: 'one-time' },
  annual: { label: 'Anual', discount: 15, months: 12, type: 'one-time' },
  biennial: { label: 'Bienal', discount: 20, months: 24, type: 'one-time' },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function calculatePeriodPrice(baseMonthly: number, period: keyof typeof periodConfig): { total: number; perMonth: number; savings: number } {
  const config = periodConfig[period];
  const fullPrice = baseMonthly * config.months;
  const discountMultiplier = 1 - (config.discount / 100);
  const total = Math.round(fullPrice * discountMultiplier);
  const perMonth = Math.round(total / config.months);
  const savings = fullPrice - total;
  
  return { total, perMonth, savings };
}

export default function HostingPriceIdsForm({ settings, onSave, isSaving }: HostingPriceIdsFormProps) {
  const [priceIds, setPriceIds] = useState<HostingPriceIds>(defaultPriceIds);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalPriceIds, setOriginalPriceIds] = useState<HostingPriceIds>(defaultPriceIds);

  useEffect(() => {
    if (settings?.hosting_price_ids?.value) {
      const loadedIds = {
        ...defaultPriceIds,
        ...settings.hosting_price_ids.value,
      };
      setPriceIds(loadedIds);
      setOriginalPriceIds(loadedIds);
    }
  }, [settings]);

  // Load base prices from settings if available
  const getBasePrice = (plan: string): number => {
    const planKey = `plan_${plan}`;
    const planData = settings?.[planKey]?.value;
    if (planData?.price) {
      return planData.price * 100; // Convert to cents
    }
    return basePrices[plan] || 0;
  };

  const updatePriceId = (plan: keyof HostingPriceIds, period: keyof PriceIds, value: string) => {
    setPriceIds(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [period]: value,
      },
    }));
    // Clear validation for this specific price
    const key = `${plan}-${period}`;
    setValidationResults(prev => {
      const newResults = { ...prev };
      delete newResults[key];
      return newResults;
    });
  };

  const validatePriceIds = async () => {
    setIsValidating(true);
    
    // Collect all non-empty price IDs
    const allPriceIds: string[] = [];
    const priceIdMap: Record<string, string> = {}; // Maps priceId to plan-period key
    
    (Object.keys(priceIds) as Array<keyof HostingPriceIds>).forEach((plan) => {
      (Object.keys(priceIds[plan]) as Array<keyof PriceIds>).forEach((period) => {
        const id = priceIds[plan][period];
        if (id && id.trim()) {
          allPriceIds.push(id);
          priceIdMap[id] = `${plan}-${period}`;
        }
      });
    });

    if (allPriceIds.length === 0) {
      toast.info("Nenhum Price ID para validar");
      setIsValidating(false);
      return true;
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-price-ids', {
        body: { priceIds: allPriceIds }
      });

      if (error) throw new Error(error.message);

      const newResults: Record<string, ValidationResult> = {};
      (data.results || []).forEach((result: ValidationResult) => {
        const key = priceIdMap[result.priceId];
        if (key) {
          newResults[key] = result;
        }
      });

      setValidationResults(newResults);

      const invalidCount = data.results?.filter((r: ValidationResult) => !r.valid).length || 0;
      
      if (invalidCount > 0) {
        toast.error(`${invalidCount} Price ID(s) inválido(s) encontrado(s)`);
        return false;
      } else {
        toast.success("Todos os Price IDs são válidos!");
        return true;
      }
    } catch (err: any) {
      toast.error("Erro ao validar: " + err.message);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    const isValid = await validatePriceIds();
    if (isValid) {
      // Log the change
      await logSettingsChange(
        'hosting_price_ids',
        'Price IDs de hospedagem atualizados',
        JSON.parse(JSON.stringify(originalPriceIds)) as Json,
        JSON.parse(JSON.stringify(priceIds)) as Json
      );
      setOriginalPriceIds(priceIds);
      onSave('hosting_price_ids', priceIds);
    }
  };

  const handleGeneratePrices = async () => {
    setIsGenerating(true);
    
    // Build plans object from settings
    const plans: Record<string, { name: string; price: number; product_id?: string }> = {};
    
    ['basic', 'professional', 'performance'].forEach((planKey) => {
      const settingKey = `plan_${planKey}`;
      const planData = settings?.[settingKey]?.value;
      if (planData?.name && planData?.price) {
        plans[planKey] = {
          name: planData.name,
          price: planData.price,
          product_id: planData.product_id,
        };
      }
    });

    if (Object.keys(plans).length === 0) {
      toast.error("Configure os planos primeiro (nome e preço) na seção Produtos → Planos");
      setIsGenerating(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-prices', {
        body: { plans }
      });

      if (error) throw new Error(error.message);
      
      if (data?.priceIds) {
        // Update local state with generated price IDs
        const newPriceIds: HostingPriceIds = {
          basic: { ...priceIds.basic, ...data.priceIds.basic },
          professional: { ...priceIds.professional, ...data.priceIds.professional },
          performance: { ...priceIds.performance, ...data.priceIds.performance },
        };
        
        setPriceIds(newPriceIds);
        
        // Auto-save the generated prices
        await logSettingsChange(
          'hosting_price_ids',
          'Price IDs gerados automaticamente no Stripe',
          JSON.parse(JSON.stringify(originalPriceIds)) as Json,
          JSON.parse(JSON.stringify(newPriceIds)) as Json
        );
        setOriginalPriceIds(newPriceIds);
        onSave('hosting_price_ids', newPriceIds);
        
        toast.success("Produtos e preços criados no Stripe com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar preços: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const isValidPriceId = (value: string): boolean => {
    if (!value) return true;
    return value.startsWith('price_');
  };

  const getConfiguredCount = (): number => {
    let count = 0;
    Object.values(priceIds).forEach(plan => {
      Object.values(plan).forEach(id => {
        if (id && typeof id === 'string' && id.startsWith('price_')) count++;
      });
    });
    return count;
  };

  const totalFields = 12;
  const configuredCount = getConfiguredCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {configuredCount}/{totalFields} configurados
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isGenerating || isSaving || isValidating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Gerar no Stripe
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerar produtos e preços no Stripe?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Esta ação irá criar automaticamente no Stripe:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Produtos para cada plano (se não existirem)</li>
                    <li>Preços para cada período (mensal, semestral, anual, bienal)</li>
                    <li>Com descontos configurados (10%, 15%, 20%)</li>
                  </ul>
                  <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                    ⚠️ Certifique-se de que os planos estão configurados com nome e preço na seção "Produtos → Planos".
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleGeneratePrices}>
                  Gerar Preços
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button 
            variant="outline" 
            onClick={validatePriceIds} 
            disabled={isValidating || isSaving || isGenerating}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Validar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isValidating || isGenerating}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {(Object.keys(priceIds) as Array<keyof HostingPriceIds>).map((plan) => {
          const basePrice = getBasePrice(plan);
          
          return (
            <Card key={plan}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Plano {planLabels[plan]}</CardTitle>
                      <CardDescription>
                        Preço base: {formatCurrency(basePrice)}/mês
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(Object.keys(periodConfig) as Array<keyof PriceIds>).map((period) => {
                    const config = periodConfig[period];
                    const value = priceIds[plan][period];
                    const isValid = isValidPriceId(value);
                    const validationKey = `${plan}-${period}`;
                    const validation = validationResults[validationKey];
                    const priceCalc = calculatePeriodPrice(basePrice, period);
                    
                    return (
                      <div key={period} className="p-4 rounded-lg border bg-card space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 font-medium">
                            {config.label}
                            {config.discount > 0 && (
                              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 dark:text-green-400">
                                {config.discount}% desc
                              </Badge>
                            )}
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs gap-1 ${
                                    config.type === 'subscription' 
                                      ? 'text-blue-600 border-blue-300' 
                                      : 'text-green-600 border-green-300'
                                  }`}
                                >
                                  {config.type === 'subscription' ? (
                                    <RefreshCw className="h-3 w-3" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  {config.type === 'subscription' ? 'Assinatura' : 'Único'}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {config.type === 'subscription' 
                                  ? 'Cobrança recorrente mensal'
                                  : 'Pagamento único sem renovação automática'
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Price calculation display */}
                        <div className="text-sm bg-muted/50 rounded-md p-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold">{formatCurrency(priceCalc.total)}</span>
                          </div>
                          {config.months > 1 && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Por mês:</span>
                                <span>{formatCurrency(priceCalc.perMonth)}</span>
                              </div>
                              {priceCalc.savings > 0 && (
                                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                                  <span>Economia:</span>
                                  <span>{formatCurrency(priceCalc.savings)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="relative">
                          <Input
                            value={value}
                            onChange={(e) => updatePriceId(plan, period, e.target.value)}
                            placeholder="price_xxxxx"
                            className={`font-mono text-sm ${
                              !isValid || (validation && !validation.valid) 
                                ? 'border-destructive' 
                                : validation?.valid 
                                  ? 'border-green-500' 
                                  : ''
                            }`}
                          />
                          {validation && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {validation.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!isValid && (
                          <p className="text-xs text-destructive">
                            Price ID deve começar com "price_"
                          </p>
                        )}
                        
                        {validation && !validation.valid && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validation.error}
                          </p>
                        )}
                        
                        {validation?.valid && validation.unitAmount && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              Stripe: {formatCurrency(validation.unitAmount)}
                              {validation.unitAmount !== priceCalc.total && (
                                <Badge variant="outline" className="ml-1 text-yellow-600 border-yellow-400 text-xs">
                                  Diferente do calculado
                                </Badge>
                              )}
                            </p>
                            {validation.productName && (
                              <p className="text-muted-foreground">
                                Produto: {validation.productName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Como obter os Price IDs:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse o painel do Stripe em Products</li>
                <li>Crie ou edite o produto de cada plano</li>
                <li>Adicione preços para cada período (mensal, semestral, etc.)</li>
                <li>Copie o Price ID (ex: price_1234abc) de cada preço</li>
              </ol>
              <p className="mt-2">
                <strong>Mensal:</strong> use mode "subscription" | <strong>Demais:</strong> use mode "payment"
              </p>
              <p className="mt-1 text-yellow-600 dark:text-yellow-400">
                ⚠️ Os valores calculados acima são sugeridos. Certifique-se de que os preços no Stripe correspondem.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
