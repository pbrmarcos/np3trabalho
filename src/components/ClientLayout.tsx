import { ReactNode } from "react";
import PageBreadcrumbs, { BreadcrumbItemType } from "@/components/PageBreadcrumbs";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, LogOut, ArrowLeft, User, Mail, AlertCircle, Palette } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useBrandLogos } from "@/hooks/useBrandLogos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  breadcrumbs?: BreadcrumbItemType[];
}

export default function ClientLayout({ 
  children, 
  showBackButton = false, 
  backTo = "/cliente/dashboard",
  title,
  subtitle,
  headerActions,
  breadcrumbs
}: ClientLayoutProps) {
  const { user, signOut } = useAuth();
  const { simpleLogo } = useBrandLogos();
  const location = useLocation();

  // Check if user has pending onboarding
  const { data: pendingOnboarding } = useQuery({
    queryKey: ["pending-onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("id, onboarding_status")
        .eq("user_id", user.id)
        .eq("onboarding_status", "pending")
        .maybeSingle();
      
      if (error) {
        console.error("Error checking onboarding status:", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user has design orders pending briefing
  const { data: pendingBriefings } = useQuery({
    queryKey: ["pending-design-briefings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("design_orders")
        .select("id, package_id, design_packages(name)")
        .eq("client_id", user.id)
        .eq("payment_status", "paid")
        .eq("status", "pending_briefing");
      
      if (error) {
        console.error("Error checking pending briefings:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const showOnboardingBanner = pendingOnboarding && location.pathname !== "/cliente/onboarding";
  const showBriefingBanner = pendingBriefings && pendingBriefings.length > 0 && !location.pathname.includes("/cliente/design/briefing");

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container px-4 md:px-6 flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <>
                <Link
                  to={backTo}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Voltar</span>
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block" />
              </>
            )}
            <Link to="/" className="flex items-center gap-2">
              <Code2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              {simpleLogo ? (
                <img 
                  src={simpleLogo} 
                  alt="WebQ" 
                  className="h-5 md:h-6 object-contain" 
                />
              ) : (
                <span className="text-lg md:text-xl font-display font-bold text-foreground">WebQ</span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate max-w-[150px] md:max-w-none">
              {user?.email}
            </span>
            <Link to="/cliente/conta">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <User className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Minha Conta</span>
              </Button>
            </Link>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2 md:px-3">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Pending Onboarding Banner */}
      {showOnboardingBanner && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container px-4 md:px-6 py-3">
            <Alert className="border-primary/30 bg-transparent">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-foreground">
                  Complete seu cadastro para começarmos a desenvolver seu projeto!
                </span>
                <Link to="/cliente/onboarding">
                  <Button size="sm" className="whitespace-nowrap">
                    Completar Cadastro
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Pending Design Briefing Banner */}
      {showBriefingBanner && (
        <div className="bg-accent/50 border-b border-accent">
          <div className="container px-4 md:px-6 py-3">
            <Alert className="border-accent bg-transparent">
              <Palette className="h-4 w-4 text-accent-foreground" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-foreground">
                  {pendingBriefings!.length === 1 
                    ? `Você tem 1 pedido de design aguardando briefing. Complete as informações para iniciarmos!`
                    : `Você tem ${pendingBriefings!.length} pedidos de design aguardando briefing. Complete as informações para iniciarmos!`
                  }
                </span>
                <Link to={`/cliente/design/briefing?order=${pendingBriefings![0].id}`}>
                  <Button size="sm" variant="secondary" className="whitespace-nowrap">
                    Preencher Briefing
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container px-4 md:px-6 py-6 md:py-8 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <PageBreadcrumbs items={breadcrumbs} />
        )}
        {(title || headerActions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {title && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}
            {headerActions}
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6 mt-8">
        <div className="container px-4 md:px-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>Precisa de ajuda?</span>
          <a 
            href="mailto:suporte@webq.com.br" 
            className="text-primary hover:underline font-medium"
          >
            suporte@webq.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
