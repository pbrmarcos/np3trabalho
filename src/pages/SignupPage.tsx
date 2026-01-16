import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Loader2, Eye, EyeOff, ArrowLeft, Sparkles, Phone, Building2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewSignup } from "@/services/notificationService";
import { logAction } from "@/services/auditService";
import { DesignOnlyOnboarding } from "@/components/design/DesignOnlyOnboarding";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { signupSchema } from "@/lib/validations";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupStep, setSignupStep] = useState<'credentials' | 'onboarding' | 'complete'>('credentials');
  const [newUserId, setNewUserId] = useState<string | null>(null);
  
  const { signUp, signInWithGoogle, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const redirectUrl = searchParams.get('redirect') || '/cliente/dashboard';
  const skipOnboarding = searchParams.get('skip_onboarding') === 'true';

  useEffect(() => {
    // If already logged in and not in onboarding step, redirect
    if (!isLoading && user && signupStep === 'credentials') {
      // Check if user has onboarding data already
      checkOnboardingStatus(user.id);
    }
  }, [user, isLoading, signupStep]);

  const checkOnboardingStatus = async (userId: string) => {
    const { data } = await supabase
      .from("client_onboarding")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      // Already has onboarding, redirect
      navigate(decodeURIComponent(redirectUrl));
    } else if (!skipOnboarding) {
      // Show onboarding step
      setNewUserId(userId);
      setSignupStep('onboarding');
    } else {
      navigate(decodeURIComponent(redirectUrl));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = signupSchema.safeParse({ email, password, confirmPassword, fullName, whatsapp, companyName });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar",
          description: error.message.includes("already registered")
            ? "Este email já está cadastrado. Tente fazer login."
            : error.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Wait for user to be created and update profile with extra data
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        // Update profile with whatsapp and company
        if (whatsapp || companyName) {
          await supabase
            .from("profiles")
            .update({
              phone: whatsapp || null,
              company_name: companyName || null,
            })
            .eq("user_id", authData.user.id);
        }

        // Notify admins about new signup
        try {
          await notifyNewSignup(
            authData.user.id,
            fullName,
            email,
            companyName || undefined,
            whatsapp || undefined
          );
        } catch (notifyErr) {
          console.warn("Failed to notify admins about signup:", notifyErr);
        }

        // Log the signup action
        try {
          await logAction({
            actionType: 'create',
            entityType: 'client',
            entityId: authData.user.id,
            entityName: fullName,
            description: `Novo cadastro design-only: ${fullName} (${email})`,
            metadata: {
              email,
              company_name: companyName || null,
              whatsapp: whatsapp || null,
              signup_type: 'design_only'
            }
          });
        } catch (logErr) {
          console.warn("Failed to log signup:", logErr);
        }

        // Move to onboarding step if not skipping
        if (!skipOnboarding) {
          setNewUserId(authData.user.id);
          setSignupStep('onboarding');
          toast({
            title: "Conta criada com sucesso!",
            description: "Agora conte-nos um pouco sobre seu negócio.",
          });
          return;
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode usar nossos serviços.",
      });
      navigate(decodeURIComponent(redirectUrl));
    } catch (err) {
      console.error("Signup error:", err);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro inesperado. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnboardingComplete = () => {
    setSignupStep('complete');
    toast({
      title: "Perfil completo!",
      description: "Agora você pode explorar nossos serviços.",
    });
    navigate(decodeURIComponent(redirectUrl));
  };

  const handleSkipOnboarding = () => {
    navigate(decodeURIComponent(redirectUrl));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Onboarding Step
  if (signupStep === 'onboarding' && newUserId) {
    return (
      <>
        <SEOHead
          pageKey="signup"
          fallbackTitle="Complete seu Perfil | WebQ - Design Digital"
          fallbackDescription="Complete seu perfil para uma experiência personalizada."
        />

        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Code2 className="h-8 w-8 text-primary" />
                <span className="text-2xl font-display font-bold text-foreground">WebQ</span>
              </div>
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-muted-foreground">Conta criada</span>
                </div>
                <div className="w-8 h-px bg-primary" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    2
                  </div>
                  <span className="text-sm font-medium text-foreground">Sobre seu negócio</span>
                </div>
              </div>

              <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                Conte-nos sobre seu negócio
              </h1>
              <p className="text-muted-foreground">
                Essas informações nos ajudam a personalizar os serviços para você
              </p>
            </div>

            <DesignOnlyOnboarding 
              userId={newUserId}
              onComplete={handleOnboardingComplete}
              onSkip={handleSkipOnboarding}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        pageKey="signup"
        fallbackTitle="Criar Conta | WebQ - Design Digital"
        fallbackDescription="Crie sua conta gratuita na WebQ e compre serviços de design profissional. Sem mensalidades, sem compromissos."
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md">
          {/* Back to home */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>

          <Card className="border-border bg-card/95 backdrop-blur">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Code2 className="h-8 w-8 text-primary" />
                <span className="text-2xl font-display font-bold text-foreground">WebQ</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mx-auto mb-2">
                <Sparkles className="h-3 w-3" />
                Cadastro Gratuito
              </div>
              <CardTitle className="text-foreground">
                Criar Conta
              </CardTitle>
              <CardDescription>
                Cadastre-se para comprar serviços de design. Sem mensalidades!
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      Empresa
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Nome da empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={password} />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar minha conta
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) {
                      toast({
                        variant: "destructive",
                        title: "Erro ao cadastrar com Google",
                        description: error.message,
                      });
                    }
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar com Google
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Já tem conta?{" "}
                  <Link to="/cliente" className="text-primary hover:underline font-medium">
                    Entrar
                  </Link>
                </p>

                <div className="text-center pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Quer um site profissional?{" "}
                    <Link to="/planos" className="text-primary hover:underline">
                      Veja nossos planos
                    </Link>
                    {" "}ou{" "}
                    <Link to="/migracao" className="text-primary hover:underline">
                      solicite migração gratuita
                    </Link>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
