import { useState, useEffect } from "react";
import { Shield, Cookie, Settings2, Check, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  useCookieConsent, 
  detectActiveCookies,
  categorizeCookie,
  categoryConfig,
  CookieCategory,
  predefinedCookies
} from "@/hooks/useCookieConsent";
import { CookieDataDeletionDialog } from "@/components/CookieDataDeletionDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DetectedCookie {
  name: string;
  source: "localStorage" | "sessionStorage" | "cookie";
  category: CookieCategory;
}

export function CookiePrivacyCard() {
  const { consent, saveCustomConsent, resetConsent } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [detectedCookies, setDetectedCookies] = useState<DetectedCookie[]>([]);
  const [customPreferences, setCustomPreferences] = useState({
    preferences: consent.preferences,
    analytics: consent.analytics,
    marketing: consent.marketing,
  });

  // Detect active cookies on mount
  useEffect(() => {
    const detected = detectActiveCookies();
    const allCookies: DetectedCookie[] = [
      ...detected.localStorage.map((name) => ({
        name,
        source: "localStorage" as const,
        category: categorizeCookie(name),
      })),
      ...detected.sessionStorage.map((name) => ({
        name,
        source: "sessionStorage" as const,
        category: categorizeCookie(name),
      })),
      ...detected.cookies.map((name) => ({
        name,
        source: "cookie" as const,
        category: categorizeCookie(name),
      })),
    ];
    setDetectedCookies(allCookies);
  }, []);

  const handleOpenDetails = () => {
    setCustomPreferences({
      preferences: consent.preferences,
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
    setShowDetails(true);
  };

  const handleSave = () => {
    saveCustomConsent(
      customPreferences.preferences,
      customPreferences.analytics,
      customPreferences.marketing
    );
    setShowDetails(false);
  };

  const categories: CookieCategory[] = ["essential", "analytics", "preferences", "marketing"];

  const getDetectedByCategory = (category: CookieCategory) => {
    return detectedCookies.filter((c) => c.category === category);
  };

  const getPredefinedByCategory = (category: CookieCategory) => {
    return predefinedCookies.filter((c) => c.category === category);
  };

  const getConsentStatus = (category: CookieCategory) => {
    if (category === "essential") return true;
    return consent[category];
  };

  const totalAccepted = [
    consent.essential,
    consent.preferences,
    consent.analytics,
    consent.marketing,
  ].filter(Boolean).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacidade e Cookies
          </CardTitle>
          <CardDescription>
            Gerencie suas preferências de cookies e privacidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Cookie className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {totalAccepted} de 4 categorias ativas
                </p>
                {consent.consentDate && (
                  <p className="text-xs text-muted-foreground">
                    Último consentimento: {format(new Date(consent.consentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Category Status Badges */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const config = categoryConfig[category];
              const isEnabled = getConsentStatus(category);
              return (
                <Badge
                  key={category}
                  variant={isEnabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isEnabled ? <Check className="h-3 w-3 mr-1" /> : null}
                  {config.label}
                </Badge>
              );
            })}
          </div>

          {/* Active Cookies Count */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{detectedCookies.length}</span> cookies/dados ativos detectados
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleOpenDetails}
              className="flex-1"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Gerenciar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                resetConsent();
                window.location.reload();
              }}
              title="Redefinir consentimento"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* LGPD Right to be Forgotten */}
          <div className="pt-2 border-t">
            <CookieDataDeletionDialog />
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Gerenciar Cookies
            </DialogTitle>
            <DialogDescription>
              Controle quais tipos de cookies e dados são armazenados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {categories.map((category) => {
              const config = categoryConfig[category];
              const predefined = getPredefinedByCategory(category);
              const detected = getDetectedByCategory(category);
              const isEnabled = category === "essential" ? true : customPreferences[category as keyof typeof customPreferences];

              return (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{config.label}</span>
                        {config.locked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Sempre ativo
                          </span>
                        )}
                        {detected.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {detected.length} ativo{detected.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={config.locked}
                      onCheckedChange={(checked) => {
                        if (!config.locked) {
                          setCustomPreferences((prev) => ({
                            ...prev,
                            [category]: checked,
                          }));
                        }
                      }}
                    />
                  </div>

                  <Accordion type="single" collapsible className="mt-2">
                    {/* Predefined cookies */}
                    {predefined.length > 0 && (
                      <AccordionItem value="predefined" className="border-0">
                        <AccordionTrigger className="text-xs py-2 hover:no-underline text-muted-foreground">
                          Cookies registrados ({predefined.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {predefined.map((cookie, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-muted/50 rounded p-2"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <code className="font-mono text-[10px] text-primary">
                                    {cookie.name}
                                  </code>
                                  <span className="text-muted-foreground shrink-0">
                                    {cookie.duration}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-1">
                                  {cookie.purpose}
                                </p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Detected active cookies */}
                    {detected.length > 0 && (
                      <AccordionItem value="detected" className="border-0">
                        <AccordionTrigger className="text-xs py-2 hover:no-underline text-primary">
                          Ativos agora ({detected.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pt-2">
                            {detected.map((cookie, idx) => (
                              <div
                                key={idx}
                                className="text-xs flex items-center justify-between bg-primary/5 rounded px-2 py-1"
                              >
                                <code className="font-mono text-[10px] truncate flex-1">
                                  {cookie.name}
                                </code>
                                <span className="text-[10px] text-muted-foreground ml-2">
                                  {cookie.source}
                                </span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDetails(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CookiePrivacyCard;
