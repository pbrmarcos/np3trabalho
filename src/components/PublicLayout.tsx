import { ReactNode } from "react";
import PublicNavbar from "./PublicNavbar";
import { useBrandLogos } from "@/hooks/useBrandLogos";
import { Code2, Instagram, Linkedin, Facebook, Twitter, MessageCircle, Youtube, Mail, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans overflow-x-hidden">
      <PublicNavbar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();
  const { fullLogo } = useBrandLogos();

  const { data: contactConfig } = useQuery({
    queryKey: ['contact_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'contact_config')
        .maybeSingle();
      
      if (error) return null;
      return data?.value as any;
    },
    staleTime: 1000 * 60 * 5,
  });

  const socialIcons: Record<string, any> = {
    instagram: Instagram,
    linkedin: Linkedin,
    facebook: Facebook,
    twitter: Twitter,
    discord: MessageCircle,
    youtube: Youtube,
  };

  const enabledSocials = contactConfig 
    ? Object.entries(contactConfig)
        .filter(([key, value]: [string, any]) => 
          typeof value === 'object' && value?.enabled && value?.url
        )
    : [];

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {fullLogo ? (
                <img 
                  src={fullLogo} 
                  alt="WebQ" 
                  className="h-6 md:h-7 object-contain" 
                />
              ) : (
                <>
                  <div className="bg-primary text-primary-foreground p-1.5 md:p-2 rounded">
                    <Code2 className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <span className="font-display font-bold text-lg md:text-xl tracking-tight text-foreground">
                    Web<span className="text-primary">Q</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Criamos sites profissionais, lojas virtuais e identidades visuais para empresas que querem crescer online.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 md:mb-4">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/planos"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Planos e Preços
                </a>
              </li>
              <li>
                <a
                  href="/design"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Serviços de Design
                </a>
              </li>
              <li>
                <a
                  href="/migracao"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Migração de Sites
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/ajuda"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Central de Ajuda
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 md:mb-4">
              Contato
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:suporte@webq.com.br"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  suporte@webq.com.br
                </a>
              </li>
              <li>
                <a
                  href="/cliente"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Portal do Cliente
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 md:mb-4">
              Redes Sociais
            </h4>
            {enabledSocials.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {enabledSocials.map(([key, value]: [string, any]) => {
                  const Icon = socialIcons[key];
                  if (!Icon) return null;
                  
                  return (
                    <a
                      key={key}
                      href={value.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={key}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Em breve</p>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-6 md:mt-8 pt-6 md:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
            © {currentYear} WebQ. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
            <a
              href="/politica-privacidade"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacidade
            </a>
            <a
              href="/termos"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
