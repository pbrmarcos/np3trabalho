import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2, Save, Cloud, FileText, Mail, Plus, Trash2, Upload, X, Eye, EyeOff, Palette } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logProjectAction } from "@/services/auditService";

const planOptions = [
  { value: "essencial", label: "Essencial" },
  { value: "profissional", label: "Profissional" },
  { value: "performance", label: "Performance" },
];

const statusOptions = [
  { value: "development", label: "Em desenvolvimento" },
  { value: "online", label: "Online" },
  { value: "maintenance", label: "Manutenção" },
  { value: "suspended", label: "Suspenso" },
];

interface EmailCredential {
  label: string;
  username: string;
  password: string;
  url: string;
  showPassword: boolean;
}

interface PendingFile {
  file: File;
  description: string;
}

export default function AdminCreateProject() {
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    plan: "essencial",
    status: "development",
    notes: "",
    cloudDriveUrl: "",
  });

  const [emailCredentials, setEmailCredentials] = useState<EmailCredential[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["admin-onboarding-for-project", onboardingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("id", onboardingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!onboardingId,
  });

  useEffect(() => {
    if (onboarding) {
      setFormData((prev) => ({
        ...prev,
        name: onboarding.company_name || "",
        domain: onboarding.domain_name || "",
        plan: onboarding.selected_plan || "essencial",
      }));
    }
  }, [onboarding]);

  const addEmailCredential = () => {
    setEmailCredentials((prev) => [
      ...prev,
      { label: "", username: "", password: "", url: "", showPassword: false },
    ]);
  };

  const removeEmailCredential = (index: number) => {
    setEmailCredentials((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmailCredential = (index: number, field: keyof EmailCredential, value: string | boolean) => {
    setEmailCredentials((prev) =>
      prev.map((cred, i) => (i === index ? { ...cred, [field]: value } : cred))
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede o limite de 10MB`);
        continue;
      }
      newFiles.push({ file, description: "" });
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileDescription = (index: number, description: string) => {
    setPendingFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, description } : f))
    );
  };

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!onboarding) throw new Error("Onboarding not found");

      // Check if project already exists for this onboarding to prevent duplicates
      const { data: existingProjects } = await supabase
        .from("client_projects")
        .select("id")
        .eq("client_id", onboarding.user_id)
        .eq("name", formData.name || onboarding.company_name);
      
      if (existingProjects && existingProjects.length > 0) {
        throw new Error("DUPLICATE_PROJECT");
      }

      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from("client_projects")
        .insert({
          client_id: onboarding.user_id,
          name: formData.name || onboarding.company_name,
          domain: formData.domain || null,
          plan: formData.plan,
          status: formData.status,
          notes: formData.notes || null,
          cloud_drive_url: formData.cloudDriveUrl || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Upload files and create records
      for (const pendingFile of pendingFiles) {
        const fileName = `${project.id}/${Date.now()}-${pendingFile.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(fileName, pendingFile.file);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("project-files")
          .getPublicUrl(fileName);

        await supabase.from("project_files").insert({
          project_id: project.id,
          file_name: pendingFile.file.name,
          file_url: urlData.publicUrl,
          file_type: pendingFile.file.type,
          description: pendingFile.description || null,
          uploaded_by: user?.id,
        });
      }

      // 3. Insert email credentials
      const validEmails = emailCredentials.filter((cred) => cred.username.trim());
      if (validEmails.length > 0) {
        const { error: credError } = await supabase.from("project_credentials").insert(
          validEmails.map((cred) => ({
            project_id: project.id,
            credential_type: "email",
            label: cred.label || "E-mail",
            username: cred.username,
            password: cred.password || null,
            url: cred.url || null,
          }))
        );

        if (credError) {
          console.error("Credential insert error:", credError);
        }
      }

      // Log audit action
      await logProjectAction(
        project.id,
        project.name,
        'create',
        `Projeto criado a partir do onboarding de ${onboarding.company_name}`,
        {
          newValue: {
            name: project.name,
            domain: project.domain,
            plan: project.plan,
            status: project.status,
            client_id: project.client_id,
            onboarding_id: onboardingId,
          },
        }
      );

      return project;
    },
    onSuccess: (data) => {
      toast.success("Projeto criado com sucesso!");
      navigate(`/admin/projects/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Create project error:", error);
      if (error.message === "DUPLICATE_PROJECT") {
        toast.error("Já existe um projeto com este nome para este cliente");
      } else {
        toast.error("Erro ao criar projeto");
      }
    },
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Clientes", href: "/admin/clients" },
    { label: "Criar Projeto" },
  ];

  if (isLoading) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayoutWithSidebar>
    );
  }

  if (!onboarding) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold text-foreground mb-2">Onboarding não encontrado</h1>
          <Link to="/admin/clients" className="text-primary hover:underline">
            Voltar para clientes
          </Link>
        </div>
      </AdminLayoutWithSidebar>
    );
  }

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Criar Projeto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o projeto para <strong>{onboarding.company_name}</strong>
          </p>
        </div>

        {/* Onboarding Data Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Dados do Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Basic Info */}
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empresa:</span>
                <span className="font-medium">{onboarding.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ramo:</span>
                <span className="font-medium capitalize">{onboarding.business_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano selecionado:</span>
                <span className="font-medium capitalize">{onboarding.selected_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">WhatsApp:</span>
                <span className="font-medium">{onboarding.whatsapp}</span>
              </div>
              {onboarding.instagram && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instagram:</span>
                  <span className="font-medium">{onboarding.instagram}</span>
                </div>
              )}
            </div>

            {/* Domain Info */}
            {onboarding.has_domain && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Domínio</p>
                <div className="grid gap-2">
                  {onboarding.domain_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domínio:</span>
                      <span className="font-medium">{onboarding.domain_name}</span>
                    </div>
                  )}
                  {onboarding.domain_provider && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registrado em:</span>
                      <span className="font-medium capitalize">{onboarding.domain_provider.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business Description */}
            {onboarding.business_description && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Descrição do Negócio</p>
                <p className="text-foreground">{onboarding.business_description}</p>
              </div>
            )}

            {/* Site Expectations */}
            {onboarding.site_expectations && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Expectativas do Site</p>
                <p className="text-foreground">{onboarding.site_expectations}</p>
              </div>
            )}

            {/* Brand Creation Section */}
            {onboarding.needs_brand_creation && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Criação de Marca</p>
                  <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Contratada</span>
                </div>
                <div className="grid gap-2">
                  {onboarding.preferred_color && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cor preferida:</span>
                      <span className="font-medium">{onboarding.preferred_color}</span>
                    </div>
                  )}
                  {onboarding.logo_description && (
                    <div className="mt-2">
                      <span className="text-muted-foreground block mb-1">Descrição da logo:</span>
                      <p className="text-foreground bg-muted/50 p-2 rounded text-sm">{onboarding.logo_description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inspiration Images */}
            {onboarding.inspiration_urls && onboarding.inspiration_urls.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Imagens de Inspiração</p>
                <div className="grid grid-cols-3 gap-2">
                  {onboarding.inspiration_urls.map((url: string, index: number) => (
                    <a 
                      key={index}
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <img 
                        src={url} 
                        alt={`Inspiração ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Logo Preview */}
            {onboarding.logo_url && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Logo Enviada</p>
                <a 
                  href={onboarding.logo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-24 h-24 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img 
                    src={onboarding.logo_url} 
                    alt="Logo"
                    className="w-full h-full object-contain bg-muted/50"
                  />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Configurações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Projeto *</Label>
              <Input
                value={formData.name || onboarding.company_name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do site/projeto"
              />
            </div>

            <div className="space-y-2">
              <Label>Domínio</Label>
              <Input
                value={formData.domain || onboarding.domain_name || ""}
                onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
                placeholder="www.exemplo.com.br"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(v) => setFormData((p) => ({ ...p, plan: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Link da Pasta do Drive
              </Label>
              <Input
                value={formData.cloudDriveUrl}
                onChange={(e) => setFormData((p) => ({ ...p, cloudDriveUrl: e.target.value }))}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <p className="text-xs text-muted-foreground">
                Link compartilhado da pasta no Google Drive, Dropbox, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notas Internas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Observações sobre o projeto..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Files Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Arquivos Iniciais
            </CardTitle>
            <CardDescription>
              Envie arquivos para o projeto (logomarca, briefing, etc.) - máx. 10MB cada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingFiles.length > 0 && (
              <div className="space-y-3">
                {pendingFiles.map((pf, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium truncate">{pf.file.name}</p>
                      <Input
                        placeholder="Descrição (opcional)"
                        value={pf.description}
                        onChange={(e) => updateFileDescription(index, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Credentials Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contas de E-mail
            </CardTitle>
            <CardDescription>
              Configure as contas de email do cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailCredentials.length > 0 && (
              <div className="space-y-4">
                {emailCredentials.map((cred, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        E-mail #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmailCredential(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Rótulo</Label>
                        <Input
                          placeholder="Ex: Contato, Comercial..."
                          value={cred.label}
                          onChange={(e) => updateEmailCredential(index, "label", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">E-mail *</Label>
                        <Input
                          placeholder="contato@empresa.com"
                          value={cred.username}
                          onChange={(e) => updateEmailCredential(index, "username", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Senha</Label>
                        <div className="relative">
                          <Input
                            type={cred.showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={cred.password}
                            onChange={(e) => updateEmailCredential(index, "password", e.target.value)}
                            className="h-9 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateEmailCredential(index, "showPassword", !cred.showPassword)}
                            className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                          >
                            {cred.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL do Webmail</Label>
                        <Input
                          placeholder="https://webmail.exemplo.com"
                          value={cred.url}
                          onChange={(e) => updateEmailCredential(index, "url", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" onClick={addEmailCredential} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar E-mail
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/clients")}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => createProjectMutation.mutate()}
            disabled={createProjectMutation.isPending}
            className="flex-1"
          >
            {createProjectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Criar Projeto
          </Button>
        </div>
      </div>
    </AdminLayoutWithSidebar>
  );
}
