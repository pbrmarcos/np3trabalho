import { Mail, Copy, Edit, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  trigger: string;
  subject: string;
  html_template: string;
  is_active: boolean;
  copy_to_admins: boolean;
  sender_email: string;
  sender_name: string;
}

interface EmailTemplateCardProps {
  template: EmailTemplate;
  onToggleActive: () => void;
  onToggleCopyAdmin: () => void;
  onEdit: () => void;
  isUpdating: boolean;
}

export default function EmailTemplateCard({
  template,
  onToggleActive,
  onToggleCopyAdmin,
  onEdit,
  isUpdating,
}: EmailTemplateCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Info Section */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <h4 className="font-semibold text-foreground">{template.name}</h4>
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="font-medium">Gatilho:</span> {template.trigger}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span className="font-medium">Remetente:</span> {template.sender_name} &lt;{template.sender_email}&gt;
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row gap-4 lg:items-center">
            {/* Toggles */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`active-${template.id}`}
                  checked={template.is_active}
                  onCheckedChange={onToggleActive}
                  disabled={isUpdating}
                  aria-label={`${template.is_active ? "Desativar" : "Ativar"} email ${template.name}`}
                />
                <Label htmlFor={`active-${template.id}`} className="text-sm cursor-pointer">
                  Ativo
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id={`copy-${template.id}`}
                  checked={template.copy_to_admins}
                  onCheckedChange={onToggleCopyAdmin}
                  disabled={isUpdating}
                  aria-label={`${template.copy_to_admins ? "Desativar" : "Ativar"} cópia para admins`}
                />
                <Label htmlFor={`copy-${template.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  Cópia Admin
                </Label>
              </div>
            </div>

            {/* Edit Button */}
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
