import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmailTemplateCard from "./EmailTemplateCard.tsx";
import EmailTemplateEditor from "./EmailTemplateEditor.tsx";
import ManualEmailComposer from "./ManualEmailComposer.tsx";
import { logAction } from "@/services/auditService";

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
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showManualComposer, setShowManualComposer] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_email_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (updates: Partial<EmailTemplate> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from("system_email_templates")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      
      // Log audit for template changes
      const changedFields = Object.keys(variables).filter(k => k !== 'id');
      logAction({
        actionType: 'update',
        entityType: 'email_template',
        entityId: variables.id,
        entityName: variables.name || 'Template de email',
        description: `Template de email atualizado (${changedFields.join(', ')})`,
        newValue: variables as Record<string, any>,
      });
      
      toast.success("Template atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.trigger.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && template.is_active) ||
      (filterStatus === "inactive" && !template.is_active);
    return matchesSearch && matchesStatus;
  });

  const handleToggleActive = (template: EmailTemplate) => {
    updateTemplateMutation.mutate({ id: template.id, is_active: !template.is_active });
  };

  const handleToggleCopyAdmin = (template: EmailTemplate) => {
    updateTemplateMutation.mutate({ id: template.id, copy_to_admins: !template.copy_to_admins });
  };

  const handleSaveTemplate = (template: EmailTemplate) => {
    updateTemplateMutation.mutate(template);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails Automáticos
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os templates de emails enviados automaticamente pelo sistema.
          </p>
        </div>
        <Button onClick={() => setShowManualComposer(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Enviar Email Manual
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou gatilho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Buscar templates de email"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por status">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {filteredTemplates?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum template encontrado.
          </div>
        ) : (
          filteredTemplates?.map((template) => (
            <EmailTemplateCard
              key={template.id}
              template={template}
              onToggleActive={() => handleToggleActive(template)}
              onToggleCopyAdmin={() => handleToggleCopyAdmin(template)}
              onEdit={() => setEditingTemplate(template)}
              isUpdating={updateTemplateMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <EmailTemplateEditor
          template={editingTemplate}
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Manual Email Composer Modal */}
      <ManualEmailComposer
        open={showManualComposer}
        onOpenChange={setShowManualComposer}
        templates={templates || []}
      />
    </div>
  );
}
