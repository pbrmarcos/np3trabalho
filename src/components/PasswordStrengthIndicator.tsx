import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const passwordRequirements = [
  { key: "length", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "Letra maiúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "number", label: "Número (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { key: "symbol", label: "Símbolo (!@#$%...)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(p) },
];

export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push("Senha deve conter pelo menos um símbolo especial");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrengthScore(password: string): number {
  return passwordRequirements.filter(req => req.test(password)).length;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const requirements: PasswordRequirement[] = passwordRequirements.map(req => ({
    label: req.label,
    met: req.test(password),
  }));

  const score = requirements.filter(r => r.met).length;
  const strengthColors = [
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-primary",
  ];

  if (!password) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < score ? strengthColors[score - 1] : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Força: {score === 0 ? "Muito fraca" : score === 1 ? "Fraca" : score === 2 ? "Média" : score === 3 ? "Boa" : "Forte"}
        </p>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {req.met ? (
              <Check className="h-3 w-3 text-primary flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-xs transition-colors",
                req.met ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
