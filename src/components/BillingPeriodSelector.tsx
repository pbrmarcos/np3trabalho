import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

export interface BillingPeriod {
  id: string;
  label: string;
  months: number;
  discountPercent: number;
  pricePerMonth: number;
  totalPrice: number;
  priceId?: string;
}

interface BillingPeriodSelectorProps {
  monthlyPrice: number;
  selectedPeriod: string;
  onPeriodChange: (periodId: string) => void;
  className?: string;
}

// Hosting plans: 6m=10%, 12m=15%, 24m=20%
const HOSTING_PERIODS = [
  { id: "monthly", label: "Mensal", months: 1, discount: 0 },
  { id: "semester", label: "Semestral (6 meses)", months: 6, discount: 10 },
  { id: "annual", label: "Anual (12 meses)", months: 12, discount: 15 },
  { id: "biennial", label: "Bienal (24 meses)", months: 24, discount: 20 },
];

export function calculateBillingPeriods(monthlyPrice: number): BillingPeriod[] {
  return HOSTING_PERIODS.map((period) => {
    const discountMultiplier = 1 - period.discount / 100;
    const pricePerMonth = Math.round(monthlyPrice * discountMultiplier);
    const totalPrice = pricePerMonth * period.months;

    return {
      id: period.id,
      label: period.label,
      months: period.months,
      discountPercent: period.discount,
      pricePerMonth,
      totalPrice,
    };
  });
}

export function BillingPeriodSelector({
  monthlyPrice,
  selectedPeriod,
  onPeriodChange,
  className,
}: BillingPeriodSelectorProps) {
  const periods = calculateBillingPeriods(monthlyPrice);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={className}>
      <Label className="text-base font-medium mb-3 block">Período de Cobrança</Label>
      <RadioGroup
        value={selectedPeriod}
        onValueChange={onPeriodChange}
        className="flex flex-col gap-2"
      >
        {periods.map((period) => {
          const isSelected = selectedPeriod === period.id;
          const savings = period.months > 1 
            ? monthlyPrice * period.months - period.totalPrice 
            : 0;

          return (
            <div key={period.id} className="relative">
              <RadioGroupItem
                value={period.id}
                id={`period-${period.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`period-${period.id}`}
                className={`
                  flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {period.months === 1 ? "Mensal" : 
                       period.months === 3 ? "Trimestral" :
                       period.months === 6 ? "Semestral" : 
                       period.months === 12 ? "Anual" : "Bienal"}
                    </span>
                    {period.months > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {period.months} meses
                      </span>
                    )}
                    {period.months > 1 && (
                      <div className="flex flex-col text-xs text-muted-foreground mt-1">
                        <span>Total: {formatCurrency(period.totalPrice)}</span>
                        {savings > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-medium text-center">
                            Economia de {formatCurrency(savings)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {period.discountPercent > 0 && (
                    <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs px-2 py-0.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {period.discountPercent}% OFF
                    </Badge>
                  )}
                  <div>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(period.pricePerMonth)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Planos semestrais, anuais e bienais são cobrados integralmente no início
      </p>
    </div>
  );
}

export default BillingPeriodSelector;
