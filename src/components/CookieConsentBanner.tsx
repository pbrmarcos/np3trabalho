import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cookie, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCookieConsent, 
  categoryConfig,
  CookieCategory 
} from "@/hooks/useCookieConsent";
import { supabase } from "@/integrations/supabase/client";

interface CookieDefinition {
  id: string;
  name: string;
  category: string;
  purpose: string;
  duration: string;
}

export default function CookieConsentBanner() {
  const { 
    consent, 
    showBanner, 
    acceptAll, 
    acceptEssentialOnly, 
    saveCustomConsent 
  } = useCookieConsent();
  
  const [showDetails, setShowDetails] = useState(false);
  const [customPreferences, setCustomPreferences] = useState({
    preferences: true,
    analytics: true,
    marketing: true,
  });

  // Fetch cookie definitions from database
  const { data: cookieDefinitions, isLoading: loadingCookies } = useQuery({
    queryKey: ['cookie-definitions-banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cookie_definitions')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return (data || []) as CookieDefinition[];
    },
    enabled: showDetails, // Only fetch when modal is open
  });

  if (!showBanner) return null;

  const handleOpenDetails = () => {
    setCustomPreferences({
      preferences: true,
      analytics: true,
      marketing: true,
    });
    setShowDetails(true);
  };

  const handleCustomSave = () => {
    saveCustomConsent(
      customPreferences.preferences,
      customPreferences.analytics,
      customPreferences.marketing
    );
    setShowDetails(false);
  };

  const getCookiesByCategory = (category: CookieCategory) => {
    if (!cookieDefinitions) return [];
    return cookieDefinitions.filter((c) => c.category === category);
  };

  const categories: CookieCategory[] = ["essential", "analytics", "preferences", "marketing"];

  return (
    <>
      {/* Discrete floating banner */}
      <div className="fixed bottom-4 left-4 z-50 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Usamos cookies
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para melhorar sua experiência no site.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDetails}
              className="flex-1 text-xs h-8"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Personalizar
            </Button>
            <Button
              size="sm"
              onClick={acceptAll}
              className="flex-1 text-xs h-8"
            >
              <Check className="h-3 w-3 mr-1" />
              Aceitar
            </Button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais cookies você permite. Cookies essenciais são sempre ativos.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              {categories.map((category) => {
                const config = categoryConfig[category];
                const cookies = getCookiesByCategory(category);
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

                    {(loadingCookies || cookies.length > 0) && (
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="cookies" className="border-0">
                          <AccordionTrigger className="text-xs py-2 hover:no-underline text-muted-foreground">
                            {loadingCookies ? (
                              "Carregando..."
                            ) : (
                              `Ver ${cookies.length} cookie${cookies.length !== 1 ? "s" : ""}`
                            )}
                          </AccordionTrigger>
                          <AccordionContent>
                            {loadingCookies ? (
                              <div className="space-y-2 pt-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                              </div>
                            ) : (
                              <div className="space-y-2 pt-2 max-h-32 overflow-y-auto scrollbar-webq">
                                {cookies.map((cookie) => (
                                  <div
                                    key={cookie.id}
                                    className="text-xs bg-muted/50 rounded p-2"
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <code className="font-mono text-[10px] text-primary break-all">
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
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-2 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                acceptEssentialOnly();
                setShowDetails(false);
              }}
              className="flex-1"
            >
              Apenas necessários
            </Button>
            <Button onClick={handleCustomSave} className="flex-1">
              Salvar preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { CookieConsentBanner };
