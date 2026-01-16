import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Code2, ArrowLeft, Loader2, Lock, Check, User, Eye, EyeOff, Phone, RefreshCw, CheckCircle2, Sparkles, TicketPercent } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { BillingPeriodSelector, calculateBillingPeriods } from "@/components/BillingPeriodSelector";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

interface PlanConfig {
  name: string;
  price: number;
  price_id: string;
  product_id: string;
  description: string;
  features: string[];
  popular?: boolean;
}

// Fallback values - will be overridden by database config
const FALLBACK_BRAND_PRICE = 150;

const planKeys: Record<string, string> = {
  essencial: "plan_basic",
  profissional: "plan_professional",
  performance: "plan_performance",
};

// Validation schemas
const signupSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, "Senha deve conter pelo menos um símbolo especial"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export default function OnboardingPage() {
  const { planId: routePlanId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const migrationId = searchParams.get("migration");
  // Support both /planos/checkout?plan=X (new) and /assinar/:planId (legacy)
  const planId = searchParams.get("plan") || routePlanId;
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [needsBrandCreation, setNeedsBrandCreation] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [promoValidation, setPromoValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error: string | null;
    discountDescription: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
  }>({
    isValidating: false,
    isValid: null,
    error: null,
    discountDescription: null,
    discountPercent: null,
    discountAmount: null,
  });

  // Auth form state
  const [signupMode, setSignupMode] = useState<'signup' | 'login'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  
  // Simple form data - only WhatsApp
  const [whatsapp, setWhatsapp] = useState("");

  // Fetch migration data if coming from migration form
  const { data: migrationData } = useQuery({
    queryKey: ["migration-request", migrationId],
    queryFn: async () => {
      if (!migrationId) return null;
      const { data, error } = await supabase
        .from("migration_requests")
        .select("*")
        .eq("id", migrationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!migrationId,
  });

  // Pre-fill form with migration data
  useEffect(() => {
    if (migrationData) {
      setNeedsMigration(true);
      setWhatsapp(migrationData.whatsapp || "");
      if (!user) {
        setAuthData(prev => ({
          ...prev,
          fullName: migrationData.name || "",
          email: migrationData.email || "",
        }));
      }
    }
  }, [migrationData, user]);

  // Validate promo code in real-time with debounce
  useEffect(() => {
    const validatePromoCode = async () => {
      const code = promoCode.trim();
      
      if (!code) {
        setPromoValidation({
          isValidating: false,
          isValid: null,
          error: null,
          discountDescription: null,
          discountPercent: null,
          discountAmount: null,
        });
        return;
      }

      if (code.length < 3) {
        return;
      }

      setPromoValidation(prev => ({ ...prev, isValidating: true }));

      try {
        const { data, error } = await supabase.functions.invoke('validate-promo-code', {
          body: { code },
        });

        if (error) throw error;

        if (data.valid) {
          setPromoValidation({
            isValidating: false,
            isValid: true,
            error: null,
            discountDescription: data.discount_description,
            discountPercent: data.discount_percent,
            discountAmount: data.discount_amount,
          });
        } else {
          setPromoValidation({
            isValidating: false,
            isValid: false,
            error: data.error || 'Código inválido',
            discountDescription: null,
            discountPercent: null,
            discountAmount: null,
          });
        }
      } catch (err) {
        console.error('Error validating promo code:', err);
        setPromoValidation({
          isValidating: false,
          isValid: false,
          error: 'Erro ao validar código',
          discountDescription: null,
          discountPercent: null,
          discountAmount: null,
        });
      }
    };

    const timeoutId = setTimeout(validatePromoCode, 500);
    return () => clearTimeout(timeoutId);
  }, [promoCode]);

  // Fetch brand creation config from database
  const { data: brandConfig } = useQuery({
    queryKey: ["brand-creation-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "brand_creation_config")
        .maybeSingle();

      if (error) throw error;
      return data?.value as { price: number; stripe_price_id: string; included: string } | null;
    },
  });

  // Use dynamic brand price from config or fallback
  const brandPrice = brandConfig?.price ?? FALLBACK_BRAND_PRICE;
  const brandIncluded = brandConfig?.included ?? "2 versões de logomarca + 2 rodadas de correções";

  const { data: planSettings, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ["plan-settings", planId],
    queryFn: async () => {
      const settingKey = planKeys[planId || ""];
      if (!settingKey) {
        throw new Error(`Plano "${planId}" não é válido`);
      }

      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", settingKey)
        .single();

      if (error) {
        console.error("Erro ao buscar plano:", error);
        throw error;
      }
      return data?.value as unknown as PlanConfig;
    },
    enabled: !!planId,
    retry: 2,
  });

  const handleAuthInputChange = (field: string, value: string) => {
    setAuthData((prev) => ({ ...prev, [field]: value }));
    if (authErrors[field]) {
      setAuthErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const calculateTotal = () => {
    const monthlyPrice = planSettings?.price || 0;
    const periods = calculateBillingPeriods(monthlyPrice);
    const selectedPeriodData = periods.find(p => p.id === billingPeriod) || periods[0];
    const planPrice = selectedPeriodData.totalPrice;
    const brandCreationPrice = needsBrandCreation ? brandPrice : 0;
    return { 
      planPrice, 
      brandPrice: brandCreationPrice, 
      total: planPrice + brandCreationPrice,
      monthlyPrice: selectedPeriodData.pricePerMonth,
      months: selectedPeriodData.months,
      discountPercent: selectedPeriodData.discountPercent,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthErrors({});

    try {
      let currentUser = user;

      // If not logged in, first create account or login
      if (!currentUser) {
        if (signupMode === 'signup') {
          const result = signupSchema.safeParse(authData);
          if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
            });
            setAuthErrors(fieldErrors);
            setIsSubmitting(false);
            return;
          }
          
          const { error } = await signUp(authData.email, authData.password, authData.fullName);
          if (error) {
            toast.error(error.message.includes("already registered") 
              ? "Este email já está cadastrado. Tente fazer login." 
              : error.message);
            setIsSubmitting(false);
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          currentUser = newUser;
          
        } else {
          const result = loginSchema.safeParse({ email: authData.email, password: authData.password });
          if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
            });
            setAuthErrors(fieldErrors);
            setIsSubmitting(false);
            return;
          }
          
          const { error } = await signIn(authData.email, authData.password);
          if (error) {
            toast.error(error.message === "Invalid login credentials" 
              ? "Email ou senha incorretos" 
              : error.message);
            setIsSubmitting(false);
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          currentUser = newUser;
        }
      }

      if (!currentUser) {
        toast.error("Erro ao autenticar. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      if (!planSettings) {
        toast.error("Plano não encontrado");
        setIsSubmitting(false);
        return;
      }

      // Validation
      if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10) {
        toast.error("WhatsApp inválido");
        setIsSubmitting(false);
        return;
      }

      // Insert minimal onboarding data with status 'pending'
      const { data: onboardingData, error: onboardingError } = await supabase
        .from("client_onboarding")
        .insert({
          user_id: currentUser.id,
          company_name: authData.fullName || "Pendente", // Temporary, will be filled in post-payment onboarding
          business_type: "outro", // Temporary, will be filled in post-payment onboarding
          whatsapp: whatsapp,
          selected_plan: planId,
          needs_brand_creation: needsBrandCreation,
          needs_migration: needsMigration,
          migration_current_domain: migrationData?.current_domain || null,
          onboarding_status: "pending",
        })
        .select("id")
        .single();

      if (onboardingError) throw onboardingError;

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            plan_id: planId,
            billing_period: billingPeriod,
            onboarding_id: onboardingData.id,
            add_brand_creation: needsBrandCreation,
            promo_code: promoCode.trim() || undefined,
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData?.url && typeof checkoutData.url === 'string' && checkoutData.url.startsWith('http')) {
        try {
          window.location.href = checkoutData.url;
        } catch {
          window.open(checkoutData.url, '_blank');
          toast.info("Uma nova aba foi aberta para o pagamento.");
        }
      } else {
        console.error("Invalid checkout URL:", checkoutData);
        throw new Error("URL de checkout inválida");
      }
    } catch (error) {
      console.error("Error during onboarding:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!planSettings || planError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Plano não encontrado</h1>
          <p className="text-muted-foreground text-sm mb-4">
            O plano "{planId}" não está disponível.
          </p>
          <Link to="/planos" className="text-primary hover:underline">
            Ver planos disponíveis
          </Link>
        </div>
      </div>
    );
  }

  const { planPrice, brandPrice: brandTotal, total, monthlyPrice, months, discountPercent } = calculateTotal();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        pageKey="plan-checkout"
        fallbackTitle="Checkout | Assinatura de Site - WebQ"
        fallbackDescription="Finalize sua assinatura e comece seu projeto digital profissional."
        canonicalUrl="https://webq.com.br/planos/checkout"
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container px-4 md:px-6 flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center gap-4">
            <Link
              to="/planos"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Voltar</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Link to="/" className="flex items-center gap-2">
              <Code2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <span className="text-lg md:text-xl font-display font-bold text-foreground">WebQ</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Form Column */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-display text-foreground mb-2">
                Finalizar assinatura
              </h1>
              <p className="text-muted-foreground">
                Crie sua conta e finalize o pagamento. Você poderá preencher os detalhes do seu projeto depois.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auth Card - Only show if user is not logged in */}
              {!user && !authLoading && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      {signupMode === 'signup' ? 'Crie sua conta' : 'Entre na sua conta'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {signupMode === 'signup' 
                        ? 'Para continuar, primeiro crie sua conta WebQ'
                        : 'Entre com sua conta existente'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {signupMode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="auth_fullName">Nome completo *</Label>
                        <Input 
                          id="auth_fullName"
                          value={authData.fullName}
                          onChange={(e) => handleAuthInputChange("fullName", e.target.value)}
                          placeholder="Seu nome completo"
                        />
                        {authErrors.fullName && (
                          <p className="text-sm text-destructive">{authErrors.fullName}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="auth_email">Email *</Label>
                      <Input 
                        id="auth_email"
                        type="email"
                        value={authData.email}
                        onChange={(e) => handleAuthInputChange("email", e.target.value)}
                        placeholder="seu@email.com"
                      />
                      {authErrors.email && (
                        <p className="text-sm text-destructive">{authErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="auth_password">Senha *</Label>
                      <div className="relative">
                        <Input 
                          id="auth_password"
                          type={showPassword ? "text" : "password"}
                          value={authData.password}
                          onChange={(e) => handleAuthInputChange("password", e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signupMode === 'signup' && (
                        <PasswordStrengthIndicator password={authData.password} />
                      )}
                      {authErrors.password && (
                        <p className="text-sm text-destructive">{authErrors.password}</p>
                      )}
                    </div>
                    
                    {signupMode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="auth_confirmPassword">Confirmar senha *</Label>
                        <Input 
                          id="auth_confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={authData.confirmPassword}
                          onChange={(e) => handleAuthInputChange("confirmPassword", e.target.value)}
                          placeholder="••••••••"
                        />
                        {authErrors.confirmPassword && (
                          <p className="text-sm text-destructive">{authErrors.confirmPassword}</p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      {signupMode === 'signup' ? 'Já tem conta?' : 'Não tem conta?'}{' '}
                      <button 
                        type="button"
                        onClick={() => {
                          setSignupMode(signupMode === 'signup' ? 'login' : 'signup');
                          setAuthErrors({});
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        {signupMode === 'signup' ? 'Entrar' : 'Cadastre-se'}
                      </button>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Logged in indicator */}
              {user && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Logado como</p>
                        <p className="font-medium text-foreground">{user.email}</p>
                      </div>
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp - Essential for contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={whatsapp}
                      onChange={handleWhatsAppChange}
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      Usaremos este número para entrar em contato sobre seu projeto
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Migration indicator if coming from migration page */}
              {migrationId && migrationData && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Migração incluída!</h3>
                        <p className="text-sm text-muted-foreground">
                          Recebemos sua solicitação de migração para{" "}
                          <strong className="text-foreground">{migrationData.current_domain}</strong>.
                          Após o pagamento, cuidaremos de tudo para você.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Optional addons */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Opcionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Migration option - only show if not coming from migration page */}
                  {!migrationId && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <Checkbox
                        id="needs_migration"
                        checked={needsMigration}
                        onCheckedChange={(checked) => setNeedsMigration(checked as boolean)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="needs_migration" className="font-medium cursor-pointer flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Tenho um site para migrar
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Nossa equipe entrará em contato para cuidar da migração do seu site atual
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Brand creation option */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <Checkbox
                      id="needs_brand"
                      checked={needsBrandCreation}
                      onCheckedChange={(checked) => setNeedsBrandCreation(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="needs_brand" className="font-medium cursor-pointer">
                        Quero criação de marca{" "}
                        <span className="text-primary font-semibold">+R$ {brandPrice}</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {brandIncluded}
                      </p>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="pt-3 border-t border-border">
                    <Label htmlFor="promo_code" className="flex items-center gap-2 mb-2">
                      <TicketPercent className="h-4 w-4" />
                      Código promocional
                    </Label>
                    <div className="relative">
                      <Input
                        id="promo_code"
                        placeholder="Digite seu código"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        maxLength={20}
                        className={`uppercase ${
                          promoValidation.isValid === true
                            ? "border-green-500 focus-visible:ring-green-500"
                            : promoValidation.isValid === false
                              ? "border-destructive focus-visible:ring-destructive"
                              : ""
                        }`}
                      />
                      {promoValidation.isValidating && (
                        <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                      {promoValidation.isValid === true && !promoValidation.isValidating && (
                        <Check className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {promoValidation.isValid === true && promoValidation.discountDescription && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ✓ {promoValidation.discountDescription}
                      </p>
                    )}
                    {promoValidation.isValid === false && promoValidation.error && (
                      <p className="text-sm text-destructive mt-1">{promoValidation.error}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Submit */}
              <div className="lg:hidden">
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {!user ? 'Criar Conta e Pagar' : 'Ir para Pagamento Seguro'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Summary Column */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <Card className="border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    📦 Resumo do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Billing Period Selector */}
                  <BillingPeriodSelector
                    monthlyPrice={planSettings.price}
                    selectedPeriod={billingPeriod}
                    onPeriodChange={setBillingPeriod}
                  />

                  {/* Payment Type Indicator */}
                  <div className={`p-3 rounded-lg border-t ${
                    billingPeriod === "monthly" 
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" 
                      : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  }`}>
                    <div className="flex items-center gap-2">
                      {billingPeriod === "monthly" ? (
                        <>
                          <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Assinatura Recorrente
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            Pagamento Único
                          </span>
                        </>
                      )}
                    </div>
                    {billingPeriod !== "monthly" && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 ml-6">
                        Válido até{" "}
                        {new Date(
                          new Date().setMonth(new Date().getMonth() + months)
                        ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Plano {planSettings.name}
                        {discountPercent > 0 && ` (${discountPercent}% off)`}
                      </span>
                      <span className="font-medium">R$ {planPrice.toFixed(2)}</span>
                    </div>
                    {brandTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Criação de Marca</span>
                        <span className="font-medium">R$ {brandTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base pt-2 border-t">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                    {billingPeriod === "monthly" && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        Renovação automática mensal
                      </p>
                    )}
                  </div>

                  {/* Desktop Submit */}
                  <div className="hidden lg:block pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {!user ? 'Criar Conta e Pagar' : 'Ir para Pagamento Seguro'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <Lock className="h-3 w-3" />
                    <span>Pagamento seguro via Stripe</span>
                  </div>
                </CardContent>
              </Card>

              {/* Plan features */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Incluso no Plano {planSettings.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {planSettings.features?.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                    {planSettings.features && planSettings.features.length > 5 && (
                      <li className="text-xs text-muted-foreground pt-1">
                        + {planSettings.features.length - 5} mais recursos
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 WebQ. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link to="/politica-privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}