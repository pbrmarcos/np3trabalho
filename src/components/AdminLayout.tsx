import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, LogOut, ArrowLeft, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

interface AdminLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  showNotifications?: boolean;
}

export default function AdminLayout({ 
  children, 
  showBackButton = false, 
  backTo = "/admin/dashboard",
  backLabel = "Voltar",
  showNotifications = false
}: AdminLayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
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
                  <span className="hidden sm:inline text-sm">{backLabel}</span>
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block" />
              </>
            )}
            <Link to="/" className="flex items-center gap-2">
              <div className="relative">
                <Code2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <ShieldCheck className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary absolute -bottom-0.5 -right-0.5" />
              </div>
              <span className="text-lg md:text-xl font-display font-bold text-foreground">WebQ</span>
              <span className="text-[10px] md:text-xs bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 rounded font-medium">Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate max-w-[150px] md:max-w-none">
              {user?.email}
            </span>
            {showNotifications && <NotificationBell />}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2 md:px-3">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 md:px-6 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
