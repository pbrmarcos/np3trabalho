import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Instagram, 
  Pencil,
  Clock,
  ExternalLink
} from "lucide-react";

interface ProjectDataProps {
  onboarding: {
    company_name: string;
    business_type: string;
    business_description?: string | null;
    whatsapp: string;
    instagram?: string | null;
    domain_name?: string | null;
    business_email?: string | null;
    phone_landline?: string | null;
    business_hours?: string | null;
    address_street?: string | null;
    address_number?: string | null;
    address_complement?: string | null;
    address_neighborhood?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zip?: string | null;
    show_address?: boolean | null;
    facebook?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    tiktok?: string | null;
    twitter?: string | null;
    needs_brand_creation?: boolean | null;
    preferred_color?: string | null;
    logo_description?: string | null;
  };
}

export default function ClientProjectData({ onboarding }: ProjectDataProps) {
  const hasAddress = onboarding.address_street || onboarding.address_city;
  const hasSocialMedia = onboarding.instagram || onboarding.facebook || onboarding.linkedin || 
                         onboarding.youtube || onboarding.tiktok || onboarding.twitter;
  const hasContact = onboarding.whatsapp || onboarding.business_email || onboarding.phone_landline;

  const formatAddress = () => {
    const parts = [];
    if (onboarding.address_street) {
      let street = onboarding.address_street;
      if (onboarding.address_number) street += `, ${onboarding.address_number}`;
      if (onboarding.address_complement) street += ` - ${onboarding.address_complement}`;
      parts.push(street);
    }
    if (onboarding.address_neighborhood) parts.push(onboarding.address_neighborhood);
    if (onboarding.address_city && onboarding.address_state) {
      parts.push(`${onboarding.address_city}/${onboarding.address_state}`);
    }
    if (onboarding.address_zip) parts.push(`CEP: ${onboarding.address_zip}`);
    return parts.join(" • ");
  };

  const socialLinks = [
    { key: 'instagram', value: onboarding.instagram, label: 'Instagram', icon: Instagram },
    { key: 'facebook', value: onboarding.facebook, label: 'Facebook' },
    { key: 'linkedin', value: onboarding.linkedin, label: 'LinkedIn' },
    { key: 'youtube', value: onboarding.youtube, label: 'YouTube' },
    { key: 'tiktok', value: onboarding.tiktok, label: 'TikTok' },
    { key: 'twitter', value: onboarding.twitter, label: 'Twitter/X' },
  ].filter(s => s.value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Dados do Projeto
          </CardTitle>
          <Link to="/cliente/projeto/editar">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{onboarding.company_name}</h3>
              <Badge variant="secondary" className="text-xs mt-1">
                {onboarding.business_type}
              </Badge>
            </div>
            {onboarding.domain_name && (
              <a 
                href={onboarding.domain_name.startsWith('http') ? onboarding.domain_name : `https://${onboarding.domain_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Globe className="h-3 w-3" />
                {onboarding.domain_name}
              </a>
            )}
          </div>
          {onboarding.business_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {onboarding.business_description}
            </p>
          )}
        </div>

        {/* Contact Info */}
        {hasContact && (
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Contato
            </h4>
            <div className="space-y-2 text-sm">
              {onboarding.whatsapp && (
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">{onboarding.whatsapp}</span>
                  <Badge variant="outline" className="text-[10px] py-0 flex-shrink-0">WhatsApp</Badge>
                </div>
              )}
              {onboarding.phone_landline && (
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">{onboarding.phone_landline}</span>
                </div>
              )}
              {onboarding.business_email && (
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{onboarding.business_email}</span>
                </div>
              )}
              {onboarding.business_hours && (
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span>{onboarding.business_hours}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Address */}
        {hasAddress && onboarding.show_address !== false && (
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Endereço
            </h4>
            <div className="flex items-start gap-2 text-sm text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{formatAddress()}</span>
            </div>
          </div>
        )}

        {/* Social Media */}
        {hasSocialMedia && (
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Redes Sociais
            </h4>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={
                    social.value?.startsWith('http') 
                      ? social.value 
                      : social.key === 'instagram' || social.key === 'tiktok' || social.key === 'twitter'
                        ? `https://${social.key}.com/${social.value?.replace('@', '')}`
                        : `https://${social.value}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Brand Creation Info */}
        {onboarding.needs_brand_creation && (onboarding.preferred_color || onboarding.logo_description) && (
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Criação de Marca
            </h4>
            <div className="space-y-1 text-sm">
              {onboarding.preferred_color && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cores:</span>
                  <span className="text-foreground">{onboarding.preferred_color}</span>
                </div>
              )}
              {onboarding.logo_description && (
                <p className="text-muted-foreground text-xs line-clamp-2">
                  {onboarding.logo_description}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
