import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Check, 
  Palette, 
  ShoppingCart, 
  Sparkles, 
  Clock,
  Loader2,
  Lock
} from "lucide-react";
import { useBrandLogos } from "@/hooks/useBrandLogos";

interface DesignPackage {
  id: string;
  name: string;
  price: number;
  description: string | null;
  includes: string[] | null;
  estimated_days: number | null;
  category_id: string;
}

interface DesignCategory {
  id: string;
  name: string;
}

export default function DesignCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { simpleLogo } = useBrandLogos();
  
  const packageId = searchParams.get("package");
  
  // Form state
  const [hasBrandIdentity, setHasBrandIdentity] = useState<string | null>(null);
  const [wantsLogoCreation, setWantsLogoCreation] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch package details
  const { data: packageData, isLoading: loadingPackage } = useQuery({
    queryKey: ["design-package", packageId],
    queryFn: async () => {
      if (!packageId) return null;
      const { data, error } = await supabase
        .from("design_packages")
        .select(`
          id,
          name,
          price,
          description,
          includes,
          estimated_days,
          category_id,
          design_service_categories(id, name)
        `)
        .eq("id", packageId)
        .eq("is_active", true)
        .single();
      
      if (error) throw error;
      return data as DesignPackage & { design_service_categories: DesignCategory };
    },
    enabled: !!packageId,
  });

  // Fetch logo creation package price
  const { data: logoPackage } = useQuery({
    queryKey: ["logo-creation-package"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_packages")
        .select("id, name, price")
        .eq("id", "pkg-brand-creation")
        .single();
      
      if (error) return { id: "pkg-brand-creation", name: "Criação de Logomarca", price: 150 };
      return data;
    },
  });

  // Auto-check logo creation when user says they don't have brand identity
  useEffect(() => {
    if (hasBrandIdentity === "no") {
      setWantsLogoCreation(true);
    } else if (hasBrandIdentity === "yes") {
      setWantsLogoCreation(false);
    }
  }, [hasBrandIdentity]);

  // Calculate total
  const basePrice = packageData?.price || 0;
  const logoPrice = wantsLogoCreation ? (logoPackage?.price || 150) : 0;
  const totalPrice = basePrice + logoPrice;

  // Format WhatsApp input
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return whatsapp;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
  };

  const handleCheckout = async () => {
    if (!packageData) return;
    
    // Validation
    if (!hasBrandIdentity) {
      toast({ title: "Selecione se você já tem identidade visual", variant: "destructive" });
      return;
    }
    
    if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10) {
      toast({ title: "Informe um WhatsApp válido", variant: "destructive" });
      return;
    }
    
    if (!termsAccepted) {
      toast({ title: "Aceite os termos de serviço para continuar", variant: "destructive" });
      return;
    }

    // If not logged in, redirect to signup with return URL
    if (!user) {
      const returnUrl = `/design/checkout?package=${packageId}`;
      navigate(`/cadastro?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Call simplified edge function
      const { data, error } = await supabase.functions.invoke("create-design-order-checkout", {
        body: {
          package_id: packageData.id,
          has_brand_identity: hasBrandIdentity === "yes",
          wants_logo_creation: wantsLogoCreation,
          whatsapp: whatsapp.replace(/\D/g, ""),
          terms_accepted: termsAccepted,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Não foi possível iniciar o checkout");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro ao processar pedido",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!packageId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Nenhum pacote selecionado</p>
            <Button onClick={() => navigate("/design")}>Ver Catálogo</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        pageKey="design-checkout"
        fallbackTitle="Checkout | Design Digital - WebQ"
        fallbackDescription="Finalize sua compra de design digital profissional."
        canonicalUrl="https://webq.com.br/design/checkout"
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="container px-4 md:px-6 flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/design"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Voltar ao Catálogo</span>
              </Link>
            </div>
            <Link to="/" className="flex items-center gap-2">
              {simpleLogo ? (
                <img src={simpleLogo} alt="WebQ" className="h-5 md:h-6 object-contain" />
              ) : (
                <span className="text-lg md:text-xl font-display font-bold text-foreground">WebQ</span>
              )}
            </Link>
          </div>
        </header>

        <main className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Main Form - Left Side */}
            <div className="md:col-span-3 space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">Finalizar Pedido</h1>
                <p className="text-muted-foreground">Complete as informações para continuar</p>
              </div>

              {/* Package Info */}
              {loadingPackage ? (
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ) : packageData ? (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {packageData.design_service_categories?.name || "Design"}
                        </Badge>
                        <h2 className="text-xl font-semibold text-foreground">{packageData.name}</h2>
                        {packageData.description && (
                          <p className="text-muted-foreground mt-1">{packageData.description}</p>
                        )}
                        {packageData.estimated_days && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                            <Clock className="h-4 w-4" />
                            <span>~{packageData.estimated_days} dias úteis</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          R$ {Number(basePrice).toFixed(0)}
                        </p>
                      </div>
                    </div>
                    
                    {packageData.includes && packageData.includes.length > 0 && (
                      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {packageData.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Brand Identity Question */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5 text-primary" />
                    Identidade Visual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Você já possui logomarca e identidade visual definida?
                  </p>
                  <RadioGroup
                    value={hasBrandIdentity || ""}
                    onValueChange={setHasBrandIdentity}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                      <RadioGroupItem value="yes" id="has-brand-yes" />
                      <Label htmlFor="has-brand-yes" className="flex-1 cursor-pointer">
                        <span className="font-medium">Sim, já tenho logo e cores definidas</span>
                        <p className="text-sm text-muted-foreground">Você enviará os arquivos após o pagamento</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                      <RadioGroupItem value="no" id="has-brand-no" />
                      <Label htmlFor="has-brand-no" className="flex-1 cursor-pointer">
                        <span className="font-medium">Não, preciso criar uma marca</span>
                        <p className="text-sm text-muted-foreground">Oferecemos criação de logomarca profissional</p>
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Logo Creation Offer */}
                  {hasBrandIdentity === "no" && logoPackage && (
                    <div 
                      className={`mt-4 p-4 rounded-xl border-2 transition-all ${
                        wantsLogoCreation 
                          ? "border-primary bg-primary/10" 
                          : "border-dashed border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="add-logo"
                          checked={wantsLogoCreation}
                          onCheckedChange={(checked) => setWantsLogoCreation(!!checked)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="add-logo" className="cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="font-semibold">{logoPackage.name}</span>
                              <Badge variant="secondary">Recomendado</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Logomarca profissional + paleta de cores + tipografia
                            </p>
                            <p className="text-lg font-bold text-primary">
                              + R$ {Number(logoPackage.price).toFixed(0)}
                            </p>
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={handleWhatsAppChange}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usaremos para comunicação sobre seu pedido
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Terms */}
              <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  Li e aceito os{" "}
                  <Link to="/termos" className="text-primary hover:underline" target="_blank">
                    termos de serviço
                  </Link>{" "}
                  e a{" "}
                  <Link to="/politica-privacidade" className="text-primary hover:underline" target="_blank">
                    política de privacidade
                  </Link>
                </Label>
              </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="md:col-span-2">
              <div className="sticky top-24">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Resumo do Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingPackage ? (
                      <>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </>
                    ) : packageData ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{packageData.name}</span>
                          <span className="font-medium">R$ {Number(basePrice).toFixed(0)}</span>
                        </div>
                        
                        {wantsLogoCreation && logoPackage && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{logoPackage.name}</span>
                            <span className="font-medium">R$ {Number(logoPackage.price).toFixed(0)}</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="text-2xl font-bold text-primary">
                            R$ {totalPrice.toFixed(0)}
                          </span>
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleCheckout}
                          disabled={isSubmitting || authLoading}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              {user ? "Pagar e Continuar" : "Criar Conta e Pagar"}
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          Pagamento seguro via Stripe
                        </p>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                {/* What happens next */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h3 className="font-medium text-sm mb-3">Após o pagamento:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">1</span>
                      <span>Você será redirecionado para completar o briefing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">2</span>
                      <span>Nossa equipe analisará seu pedido</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">3</span>
                      <span>Você receberá as artes no prazo estimado</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
