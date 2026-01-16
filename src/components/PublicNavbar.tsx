import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Code2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { useBrandLogos } from "@/hooks/useBrandLogos";

const navLinks = [
  { name: "Início", href: "/" },
  { name: "Planos", href: "/planos" },
  { name: "Design", href: "/design" },
  { name: "Migração", href: "/migracao" },
  { name: "Blog", href: "/blog" },
  { name: "Ajuda", href: "/ajuda" },
];

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { fullLogo } = useBrandLogos();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-border py-2 md:py-3"
          : "bg-transparent border-transparent py-3 md:py-4"
      )}
    >
      <div className="container flex items-center justify-between min-w-0">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          {fullLogo ? (
            <img 
              src={fullLogo} 
              alt="WebQ" 
              className="h-8 md:h-10 object-contain transition-transform group-hover:scale-105" 
            />
          ) : (
            <>
              <div className="bg-primary text-primary-foreground p-1.5 md:p-2 rounded transition-transform group-hover:scale-105">
                <Code2 className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <span className="font-display font-bold text-lg md:text-xl tracking-tight text-foreground">
                Web<span className="text-primary">Q</span>
              </span>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === link.href
                  ? "text-primary"
                  : "text-foreground/70 dark:text-muted-foreground"
              )}
            >
              {link.name}
            </Link>
          ))}
          <ThemeToggle />
          <Button variant="secondary" asChild>
            <Link to="/cliente">Área do Cliente</Link>
          </Button>
        </nav>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground hover:bg-muted rounded transition-colors"
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 top-[57px] bg-background border-b border-border transition-all duration-300 ease-out",
          isMobileMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <nav className="container py-4 flex flex-col gap-2">
          {navLinks.map((link, index) => (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                "text-base font-medium py-3 px-2 rounded-lg transition-colors hover:bg-muted",
                location.pathname === link.href
                  ? "text-primary bg-primary/5"
                  : "text-foreground/70 dark:text-muted-foreground"
              )}
              style={{
                animationDelay: isMobileMenuOpen ? `${index * 50}ms` : "0ms",
              }}
            >
              {link.name}
            </Link>
          ))}
          <Button variant="secondary" className="mt-2 w-full" asChild>
            <Link to="/cliente">Área do Cliente</Link>
          </Button>
        </nav>
      </div>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-[57px] bg-background/80 backdrop-blur-sm z-[-1]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
