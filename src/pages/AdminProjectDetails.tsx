import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Phone, Globe, Palette, 
  User, Key, FileText, Settings, Plus, Trash2, Eye, EyeOff, Copy, 
  Upload, Download, ExternalLink, Loader2, Ticket, Save, AlertTriangle, Archive, Cloud, Send
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TicketsList from "@/components/admin/TicketsList";
import ActionLogTimeline from "@/components/admin/ActionLogTimeline";
import BrandManagementTab from "@/components/admin/BrandManagementTab";
import AdminMessageHistory from "@/components/admin/AdminMessageHistory";
import { notifyProjectStatusUpdate, notifyAdminMessage, notifyDomainStatusChange, notifyHostingDataReady } from "@/services/notificationService";
import { logProjectAction, logFileAction, logAction } from "@/services/auditService";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import MigrationCard from "@/components/admin/MigrationCard";
import { encryptValue, encryptBatch, decryptBatch } from "@/lib/crypto";
import ErrorState from "@/components/ErrorState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Credential {
  id: string;
  project_id: string;
  credential_type: string;
  label: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
}

interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  description: string | null;
  created_at: string;
}

const credentialTypes = [
  { value: "hosting", label: "Hospedagem" },
  { value: "email", label: "Email / Webmail" },
  { value: "analytics", label: "Analytics / Métricas" },
  { value: "domain", label: "Domínio" },
  { value: "other", label: "Outro" },
];

const statusOptions = [
  { value: "development", label: "Em desenvolvimento" },
  { value: "online", label: "Online" },
  { value: "maintenance", label: "Manutenção" },
  { value: "suspended", label: "Suspenso" },
];

const DEVELOPER_EMAIL = "desenvolvedor@webq.com.br";

export default function AdminProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isAddingCredential, setIsAddingCredential] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [newCredential, setNewCredential] = useState({
    credential_type: "hosting",
    label: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  // Admin-only states
  const [isDownloading, setIsDownloading] = useState(false);
  const [cloudDriveUrl, setCloudDriveUrl] = useState("");
  const [isSavingDriveUrl, setIsSavingDriveUrl] = useState(false);
  
  // Send message states
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageType, setMessageType] = useState<"info" | "warning" | "success">("info");

  // Domain and hosting management states
  const [domainStatus, setDomainStatus] = useState("");
  const [domainLink, setDomainLink] = useState("");
  const [dnsRecord1, setDnsRecord1] = useState("");
  const [dnsRecord2, setDnsRecord2] = useState("");
  const [domainNotes, setDomainNotes] = useState("");
  const [serverIp, setServerIp] = useState("185.158.133.1");
  const [cpanelUrl, setCpanelUrl] = useState("");
  const [cpanelLogin, setCpanelLogin] = useState("");
  const [cpanelPassword, setCpanelPassword] = useState("");
  const [showCpanelPassword, setShowCpanelPassword] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isNotifyingClient, setIsNotifyingClient] = useState(false);
  
  // Site access credentials
  const [siteAccessUrl, setSiteAccessUrl] = useState("");
  const [siteAccessLogin, setSiteAccessLogin] = useState("");
  const [siteAccessPassword, setSiteAccessPassword] = useState("");
  const [showSiteAccessPassword, setShowSiteAccessPassword] = useState(false);

  // Developer-only check (for deletion)
  const isDeveloper = user?.email === DEVELOPER_EMAIL;
  
  // Active tab state (controlled to prevent reset on re-render)
  const [activeTab, setActiveTab] = useState("client");

  // Fetch project details
  const { data: project, isLoading: loadingProject, error: projectError, refetch: refetchProject } = useQuery({
    queryKey: ["admin-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch client onboarding data
  const { data: onboarding, isLoading: loadingOnboarding } = useQuery({
    queryKey: ["admin-onboarding", project?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", project?.client_id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!project?.client_id,
  });

  // Fetch client profile
  const { data: clientProfile } = useQuery({
    queryKey: ["client-profile", project?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", project?.client_id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!project?.client_id,
  });

  // Fetch credentials
  const { data: credentials, isLoading: loadingCredentials } = useQuery({
    queryKey: ["project-credentials", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_credentials")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Credential[];
    },
    enabled: !!projectId,
  });

  // Fetch files
  const { data: files, isLoading: loadingFiles } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectFile[];
    },
    enabled: !!projectId,
  });

  // Update project status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("client_projects")
        .update({ status })
        .eq("id", projectId);
      if (error) throw error;
      return status;
    },
    onSuccess: async (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["admin-project", projectId] });
      toast.success("Status atualizado!");
      
      // Audit log
      if (projectId && project?.name) {
        await logProjectAction(projectId, project.name, 'status_change', `Status alterado para "${newStatus}"`, {
          oldValue: { status: project?.status },
          newValue: { status: newStatus }
        });
      }
      
      // Send notification and email to client
      if (project?.client_id && projectId) {
        try {
          await notifyProjectStatusUpdate(
            project.client_id,
            projectId,
            project.name,
            newStatus,
            project.domain
          );
        } catch (notifyError) {
          console.warn("Failed to send project status notification:", notifyError);
        }
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Add credential mutation
  const addCredentialMutation = useMutation({
    mutationFn: async (data: typeof newCredential) => {
      // Encrypt password before saving
      let encryptedPassword = data.password;
      if (data.password) {
        try {
          encryptedPassword = await encryptValue(data.password) || data.password;
        } catch (err) {
          console.error('Failed to encrypt password:', err);
        }
      }
      
      const { error } = await supabase.from("project_credentials").insert({
        project_id: projectId,
        ...data,
        password: encryptedPassword,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["project-credentials", projectId] });
      
      // Audit log
      if (projectId && project?.name) {
        await logProjectAction(projectId, project.name, 'create', `Credencial "${newCredential.label}" adicionada`, {
          newValue: { type: newCredential.credential_type, label: newCredential.label }
        });
      }
      
      setNewCredential({
        credential_type: "hosting",
        label: "",
        username: "",
        password: "",
        url: "",
        notes: "",
      });
      setIsAddingCredential(false);
      toast.success("Credencial adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar credencial");
    },
  });

  // Delete credential mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await supabase
        .from("project_credentials")
        .delete()
        .eq("id", credentialId);
      if (error) throw error;
      return credentialId;
    },
    onSuccess: async (credentialId) => {
      queryClient.invalidateQueries({ queryKey: ["project-credentials", projectId] });
      
      // Audit log
      if (projectId && project?.name) {
        await logProjectAction(projectId, project.name, 'delete', `Credencial removida`);
      }
      
      toast.success("Credencial removida!");
    },
    onError: () => {
      toast.error("Erro ao remover credencial");
    },
  });

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploadingFile(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-files")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("project_files").insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileExt,
        uploaded_by: user?.id,
      });

      if (insertError) throw insertError;

      // Audit log
      await logFileAction(projectId, file.name, 'upload', `Arquivo "${file.name}" enviado para o projeto ${project?.name}`);

      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      const { error } = await supabase
        .from("project_files")
        .delete()
        .eq("id", fileId);
      if (error) throw error;
      return { fileId, fileName };
    },
    onSuccess: async (_, variables) => {
      // Audit log
      if (projectId && project?.name) {
        await logFileAction(variables.fileId, variables.fileName, 'delete', `Arquivo "${variables.fileName}" excluído do projeto ${project.name}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success("Arquivo removido!");
    },
    onError: () => {
      toast.error("Erro ao remover arquivo");
    },
  });

  // Admin-only: Download all client data
  const handleDownloadClientData = async () => {
    if (!project?.client_id || !isAdmin) return;

    setIsDownloading(true);
    try {
      // Force refresh token to ensure we have a valid session
      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-client-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ client_id: project.client_id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao baixar dados");
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-cliente-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Download iniciado!");
    } catch (error: any) {
      console.error("Error downloading client data:", error);
      toast.error(error.message || "Erro ao baixar dados");
    } finally {
      setIsDownloading(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Sync cloudDriveUrl state with project data
  useEffect(() => {
    if (project?.cloud_drive_url) {
      setCloudDriveUrl(project.cloud_drive_url);
    }
  }, [project?.cloud_drive_url]);

  // Sync domain and hosting states with project data (decrypt passwords)
  useEffect(() => {
    const loadProjectData = async () => {
      if (project) {
        setDomainStatus(project.domain_status || "needs_registration");
        setDomainLink(project.domain || "");
        setDnsRecord1(project.dns_record_1 || "");
        setDnsRecord2(project.dns_record_2 || "");
        setDomainNotes(project.domain_notes || "");
        setServerIp(project.server_ip || "185.158.133.1");
        setCpanelUrl(project.cpanel_url || "");
        setCpanelLogin(project.cpanel_login || "");
        setSiteAccessUrl(project.site_access_url || "");
        setSiteAccessLogin(project.site_access_login || "");
        
        // Decrypt passwords
        try {
          const decrypted = await decryptBatch({
            cpanel_password: project.cpanel_password,
            site_access_password: project.site_access_password,
          });
          setCpanelPassword(decrypted.cpanel_password || "");
          setSiteAccessPassword(decrypted.site_access_password || "");
        } catch (err) {
          console.error('Failed to decrypt passwords:', err);
          setCpanelPassword(project.cpanel_password || "");
          setSiteAccessPassword(project.site_access_password || "");
        }
      }
    };
    loadProjectData();
  }, [project]);

  // Save domain and hosting configuration
  const handleSaveDomain = async () => {
    if (!projectId || !project) return;
    
    const previousStatus = project.domain_status;
    setIsSavingDomain(true);
    try {
      // Encrypt passwords before saving
      const encryptedPasswords = await encryptBatch({
        cpanel_password: cpanelPassword.trim() || null,
        site_access_password: siteAccessPassword.trim() || null,
      });
      
      const { error } = await supabase
        .from("client_projects")
        .update({ 
          domain_status: domainStatus,
          domain: domainLink.trim() || null,
          dns_record_1: dnsRecord1.trim() || null,
          dns_record_2: dnsRecord2.trim() || null,
          domain_notes: domainNotes.trim() || null,
          server_ip: serverIp.trim() || null,
          cpanel_url: cpanelUrl.trim() || null,
          cpanel_login: cpanelLogin.trim() || null,
          cpanel_password: encryptedPasswords.cpanel_password,
          site_access_url: siteAccessUrl.trim() || null,
          site_access_login: siteAccessLogin.trim() || null,
          site_access_password: encryptedPasswords.site_access_password,
        })
        .eq("id", projectId);
      
      if (error) throw error;
      
      // Audit log
      await logProjectAction(projectId, project.name, 'update', 'Configurações de domínio/hospedagem atualizadas', {
        newValue: { domain_status: domainStatus, domain: domainLink.trim() || null },
      });
      
      // Notify client if domain status changed to pointed or active
      if (domainStatus !== previousStatus && (domainStatus === "pointed" || domainStatus === "active")) {
        try {
          await notifyDomainStatusChange(
            project.client_id,
            projectId,
            project.name,
            domainStatus,
            domainLink.trim() || undefined
          );
        } catch (notifyError) {
          console.error("Error sending domain notification:", notifyError);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-project", projectId] });
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSavingDomain(false);
    }
  };

  // Save Cloud Drive URL
  const handleSaveCloudDriveUrl = async () => {
    if (!projectId) return;
    
    setIsSavingDriveUrl(true);
    try {
      const oldUrl = project?.cloud_drive_url;
      const { error } = await supabase
        .from("client_projects")
        .update({ cloud_drive_url: cloudDriveUrl.trim() || null })
        .eq("id", projectId);
      
      if (error) throw error;
      
      // Audit log
      if (project?.name) {
        await logProjectAction(projectId, project.name, 'update', `Cloud Drive URL ${cloudDriveUrl.trim() ? 'configurado' : 'removido'}`, {
          oldValue: { cloud_drive_url: oldUrl },
          newValue: { cloud_drive_url: cloudDriveUrl.trim() || null },
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-project", projectId] });
      toast.success("Link do Drive salvo!");
    } catch (error) {
      toast.error("Erro ao salvar link do Drive");
    } finally {
      setIsSavingDriveUrl(false);
    }
  };

  // Send message to client
  const handleSendMessage = async () => {
    if (!project?.client_id || !messageContent.trim()) return;
    
    setIsSendingMessage(true);
    try {
      await notifyAdminMessage(
        project.client_id,
        projectId!,
        project.name,
        messageContent.trim(),
        messageType
      );
      
      // Audit log
      await logAction({
        actionType: 'send',
        entityType: 'message',
        entityId: projectId,
        entityName: `Mensagem para ${project.name}`,
        description: `Mensagem enviada para o cliente do projeto ${project.name}`,
        newValue: { message: messageContent.trim(), message_type: messageType },
        metadata: { project_id: projectId, client_id: project.client_id, project_name: project.name },
      });
      
      toast.success("Mensagem enviada com sucesso!");
      setMessageContent("");
      setMessageType("info");
      setIsMessageDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-messages", projectId] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const isLoading = loadingProject || loadingOnboarding;

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Clientes", href: "/admin/clients" },
    { label: project?.name || "Projeto" }
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

  if (projectError) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <ErrorState
          title="Erro ao carregar projeto"
          message="Não foi possível carregar os dados do projeto. Verifique sua conexão e tente novamente."
          onRetry={() => refetchProject()}
          showBackButton
        />
      </AdminLayoutWithSidebar>
    );
  }

  if (!project) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold text-foreground mb-2">Projeto não encontrado</h1>
          <Link to="/admin/clients" className="text-primary hover:underline">
            Voltar para clientes
          </Link>
        </div>
      </AdminLayoutWithSidebar>
    );
  }

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      {/* Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {onboarding?.business_type && `${onboarding.business_type} · `}
              Plano {project.plan}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Send Message Button */}
          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Enviar Mensagem</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Mensagem ao Cliente</DialogTitle>
                <DialogDescription>
                  Esta mensagem aparecerá na timeline do cliente, como notificação e será enviada por e-mail.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo da mensagem</Label>
                  <RadioGroup
                    value={messageType}
                    onValueChange={(v) => setMessageType(v as "info" | "warning" | "success")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="info" id="msg-info" />
                      <Label htmlFor="msg-info" className="font-normal cursor-pointer">Info</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="warning" id="msg-warning" />
                      <Label htmlFor="msg-warning" className="font-normal cursor-pointer">Aviso</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="success" id="msg-success" />
                      <Label htmlFor="msg-success" className="font-normal cursor-pointer">Sucesso</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Ex: Tentamos entrar em contato por telefone..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {messageContent.length}/500
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsMessageDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || isSendingMessage}
                  className="gap-2"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Select
            value={project.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-[180px]">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="client" className="gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Credenciais</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Arquivos</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            {onboarding?.needs_brand_creation && (
              <TabsTrigger value="brand" className="gap-1">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Marca</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Client Data Tab */}
          <TabsContent value="client" className="space-y-4">
            {onboarding ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Informações da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <p className="font-medium">{onboarding.company_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ramo</Label>
                      <p className="font-medium capitalize">{onboarding.business_type}</p>
                    </div>
                    {onboarding.business_description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Descrição</Label>
                        <p className="text-sm">{onboarding.business_description}</p>
                      </div>
                    )}
                    {onboarding.site_expectations && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Expectativas do site</Label>
                        <p className="text-sm">{onboarding.site_expectations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                        <p className="font-medium">{onboarding.whatsapp}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://wa.me/55${onboarding.whatsapp.replace(/\D/g, "")}`, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    </div>
                    {onboarding.phone_landline && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Telefone Fixo</Label>
                        <p className="font-medium">{onboarding.phone_landline}</p>
                      </div>
                    )}
                    {onboarding.business_email && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Email Comercial</Label>
                        <p className="font-medium">{onboarding.business_email}</p>
                      </div>
                    )}
                    {onboarding.business_hours && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Horário de Funcionamento</Label>
                        <p className="font-medium">{onboarding.business_hours}</p>
                      </div>
                    )}
                    {onboarding.instagram && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Instagram</Label>
                        <p className="font-medium">{onboarding.instagram}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address Card */}
                {(onboarding.address_street || onboarding.address_city) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Endereço
                        {onboarding.show_address === false && (
                          <Badge variant="secondary" className="text-xs">Oculto no site</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {onboarding.address_street && (
                        <p className="font-medium">
                          {onboarding.address_street}
                          {onboarding.address_number && `, ${onboarding.address_number}`}
                          {onboarding.address_complement && ` - ${onboarding.address_complement}`}
                        </p>
                      )}
                      {onboarding.address_neighborhood && (
                        <p className="text-sm text-muted-foreground">{onboarding.address_neighborhood}</p>
                      )}
                      {(onboarding.address_city || onboarding.address_state) && (
                        <p className="text-sm text-muted-foreground">
                          {onboarding.address_city}{onboarding.address_state && `/${onboarding.address_state}`}
                          {onboarding.address_zip && ` - CEP: ${onboarding.address_zip}`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Social Media Card */}
                {(onboarding.facebook || onboarding.linkedin || onboarding.youtube || onboarding.tiktok || onboarding.twitter) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Redes Sociais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {onboarding.instagram && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Instagram</Label>
                            <p className="font-medium text-sm">{onboarding.instagram}</p>
                          </div>
                        )}
                        {onboarding.facebook && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Facebook</Label>
                            <p className="font-medium text-sm truncate">{onboarding.facebook}</p>
                          </div>
                        )}
                        {onboarding.linkedin && (
                          <div>
                            <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                            <p className="font-medium text-sm truncate">{onboarding.linkedin}</p>
                          </div>
                        )}
                        {onboarding.youtube && (
                          <div>
                            <Label className="text-xs text-muted-foreground">YouTube</Label>
                            <p className="font-medium text-sm truncate">{onboarding.youtube}</p>
                          </div>
                        )}
                        {onboarding.tiktok && (
                          <div>
                            <Label className="text-xs text-muted-foreground">TikTok</Label>
                            <p className="font-medium text-sm">{onboarding.tiktok}</p>
                          </div>
                        )}
                        {onboarding.twitter && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Twitter/X</Label>
                            <p className="font-medium text-sm">{onboarding.twitter}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Domínio e Hospedagem
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={handleSaveDomain}
                      disabled={isSavingDomain}
                      className="gap-2"
                    >
                      {isSavingDomain ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status do Domínio */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Status do Domínio</Label>
                      <Select value={domainStatus} onValueChange={setDomainStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="needs_registration">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                              Precisa registrar domínio
                            </span>
                          </SelectItem>
                          <SelectItem value="pending_dns">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-500" />
                              Aguardando apontamento DNS
                            </span>
                          </SelectItem>
                          <SelectItem value="pointed">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Domínio apontado para WebQ
                            </span>
                          </SelectItem>
                          <SelectItem value="active">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-600" />
                              Domínio ativo e funcionando
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Domínio (link) */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Domínio (link)</Label>
                      <Input
                        placeholder="exemplo.com.br"
                        value={domainLink}
                        onChange={(e) => setDomainLink(e.target.value)}
                      />
                    </div>

                    {/* DNS Records */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">DNS 1</Label>
                        <Input
                          placeholder="A @ 185.158.133.1"
                          value={dnsRecord1}
                          onChange={(e) => setDnsRecord1(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">DNS 2</Label>
                        <Input
                          placeholder="A www 185.158.133.1"
                          value={dnsRecord2}
                          onChange={(e) => setDnsRecord2(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Hospedagem - Separator */}
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-foreground mb-3">Hospedagem</p>
                      
                      {/* IP do Servidor */}
                      <div className="space-y-2 mb-4">
                        <Label className="text-xs text-muted-foreground">IP do Servidor</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="185.158.133.1"
                            value={serverIp}
                            onChange={(e) => setServerIp(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(serverIp, "IP")}
                            disabled={!serverIp}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* cPanel */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">URL do cPanel</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://servidor.com:2083"
                              value={cpanelUrl}
                              onChange={(e) => setCpanelUrl(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(cpanelUrl, "URL do cPanel")}
                              disabled={!cpanelUrl}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Login cPanel</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="usuario"
                                value={cpanelLogin}
                                onChange={(e) => setCpanelLogin(e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(cpanelLogin, "Login")}
                                disabled={!cpanelLogin}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Senha cPanel</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={showCpanelPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  value={cpanelPassword}
                                  onChange={(e) => setCpanelPassword(e.target.value)}
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() => setShowCpanelPassword(!showCpanelPassword)}
                                >
                                  {showCpanelPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(cpanelPassword, "Senha")}
                                disabled={!cpanelPassword}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acesso ao Site - Destaque */}
                    <div className="pt-4 border-t border-border">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Acesso ao Site (para o Cliente)
                        </p>
                        
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">URL de Acesso</Label>
                          <Input
                            placeholder="https://exemplo.com.br/admin"
                            value={siteAccessUrl}
                            onChange={(e) => setSiteAccessUrl(e.target.value)}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Usuário</Label>
                            <Input
                              placeholder="usuario"
                              value={siteAccessLogin}
                              onChange={(e) => setSiteAccessLogin(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Senha</Label>
                            <div className="relative">
                              <Input
                                type={showSiteAccessPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={siteAccessPassword}
                                onChange={(e) => setSiteAccessPassword(e.target.value)}
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowSiteAccessPassword(!showSiteAccessPassword)}
                              >
                                {showSiteAccessPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const text = `IP do Servidor: ${serverIp || "Não configurado"}
URL do cPanel: ${cpanelUrl || "Não configurado"}
Login cPanel: ${cpanelLogin || "Não configurado"}
Senha cPanel: ${cpanelPassword || "Não configurado"}
URL de Acesso ao Site: ${siteAccessUrl || "Não configurado"}
Usuário: ${siteAccessLogin || "Não configurado"}
Senha: ${siteAccessPassword || "Não configurado"}`;
                          navigator.clipboard.writeText(text);
                          toast.success("Credenciais copiadas!");
                        }}
                        disabled={!serverIp && !cpanelUrl && !cpanelLogin && !cpanelPassword && !siteAccessUrl}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Tudo
                      </Button>
                      
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          if (!project?.client_id || !projectId) return;
                          
                          setIsNotifyingClient(true);
                          try {
                            await notifyHostingDataReady(
                              project.client_id,
                              projectId,
                              project.name
                            );
                            toast.success("Cliente notificado com sucesso!");
                          } catch (error) {
                            console.error("Error notifying client:", error);
                            toast.error("Erro ao notificar cliente");
                          } finally {
                            setIsNotifyingClient(false);
                          }
                        }}
                        disabled={isNotifyingClient || !project?.client_id}
                      >
                        {isNotifyingClient ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Notificar Cliente
                      </Button>
                    </div>

                    {/* Anotações */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Anotações</Label>
                      <Textarea
                        placeholder="Notas sobre o domínio e hospedagem..."
                        value={domainNotes}
                        onChange={(e) => setDomainNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Dados do Onboarding */}
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Dados do Onboarding
                      </p>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Tem domínio:</span>{" "}
                          <span className="font-medium">{onboarding.has_domain ? "Sim" : "Não"}</span>
                        </p>
                        {onboarding.has_domain && onboarding.domain_name && (
                          <p>
                            <span className="text-muted-foreground">Domínio informado:</span>{" "}
                            <span className="font-medium">{onboarding.domain_name}</span>
                          </p>
                        )}
                        {onboarding.domain_provider && (
                          <p>
                            <span className="text-muted-foreground">Registrado em:</span>{" "}
                            <span className="font-medium">
                              {onboarding.domain_provider === "registro_br" ? "Registro.br" : 
                                onboarding.domain_provider === "locaweb" ? "Locaweb" :
                                onboarding.domain_provider === "hostinger" ? "Hostinger" :
                                onboarding.domain_provider === "godaddy" ? "GoDaddy" :
                                onboarding.domain_provider === "hostgator" ? "HostGator" :
                                onboarding.domain_provider === "uol_host" ? "UOL Host" :
                                onboarding.domain_provider === "kinghost" ? "KingHost" :
                                onboarding.domain_provider === "outro" ? "Outro" : onboarding.domain_provider}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Marca
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {onboarding.has_logo ? (
                      <>
                        <Badge variant="secondary">Tem logo própria</Badge>
                        {onboarding.logo_url && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground block mb-2">Logo Enviada</Label>
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
                      </>
                    ) : onboarding.needs_brand_creation ? (
                      <>
                        <Badge className="bg-primary/10 text-primary">Criação de marca contratada</Badge>
                        {onboarding.preferred_color && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Cor preferida</Label>
                            <p className="text-sm">{onboarding.preferred_color}</p>
                          </div>
                        )}
                        {onboarding.logo_description && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Descrição</Label>
                            <p className="text-sm">{onboarding.logo_description}</p>
                          </div>
                        )}
                        {onboarding.inspiration_urls && onboarding.inspiration_urls.length > 0 && (
                          <div className="pt-2">
                            <Label className="text-xs text-muted-foreground block mb-2">
                              Imagens de Inspiração ({onboarding.inspiration_urls.length})
                            </Label>
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
                      </>
                    ) : (
                      <Badge variant="outline">Não tem logo</Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Migration Card */}
                {onboarding.needs_migration && (
                  <MigrationCard 
                    onboarding={onboarding}
                    clientEmail={clientProfile?.email}
                  />
                )}

                {/* Message History */}
                {project?.client_id && projectId && (
                  <AdminMessageHistory 
                    projectId={projectId}
                    clientId={project.client_id}
                    projectName={project.name}
                    onSendMessage={() => setIsMessageDialogOpen(true)}
                  />
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Dados de onboarding não encontrados.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Logins, senhas e acessos do projeto
              </p>
              <Dialog open={isAddingCredential} onOpenChange={setIsAddingCredential}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Credencial</DialogTitle>
                    <DialogDescription>
                      Adicione informações de acesso para este projeto.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={newCredential.credential_type}
                        onValueChange={(v) => setNewCredential((p) => ({ ...p, credential_type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {credentialTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome / Label *</Label>
                      <Input
                        value={newCredential.label}
                        onChange={(e) => setNewCredential((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Ex: Painel de hospedagem"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={newCredential.url}
                        onChange={(e) => setNewCredential((p) => ({ ...p, url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Usuário</Label>
                        <Input
                          value={newCredential.username}
                          onChange={(e) => setNewCredential((p) => ({ ...p, username: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha</Label>
                        <Input
                          type="password"
                          value={newCredential.password}
                          onChange={(e) => setNewCredential((p) => ({ ...p, password: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Textarea
                        value={newCredential.notes}
                        onChange={(e) => setNewCredential((p) => ({ ...p, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingCredential(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => addCredentialMutation.mutate(newCredential)}
                      disabled={!newCredential.label || addCredentialMutation.isPending}
                    >
                      {addCredentialMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingCredentials ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : credentials && credentials.length > 0 ? (
              <div className="space-y-3">
                {credentials.map((cred) => {
                  const typeInfo = credentialTypes.find((t) => t.value === cred.credential_type);
                  return (
                    <Card key={cred.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {typeInfo?.label || cred.credential_type}
                              </Badge>
                              <h4 className="font-medium">{cred.label}</h4>
                            </div>
                            
                            {cred.url && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">URL:</span>
                                <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs">
                                  {cred.url}
                                </a>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(cred.url!, "URL")}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {cred.username && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Usuário:</span>
                                <code className="bg-muted px-2 py-0.5 rounded">{cred.username}</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(cred.username!, "Usuário")}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {cred.password && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Senha:</span>
                                <code className="bg-muted px-2 py-0.5 rounded font-mono">
                                  {showPasswords[cred.id] ? cred.password : "••••••••"}
                                </code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(cred.id)}>
                                  {showPasswords[cred.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(cred.password!, "Senha")}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {cred.notes && (
                              <p className="text-xs text-muted-foreground">{cred.notes}</p>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCredentialMutation.mutate(cred.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Key className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Nenhuma credencial</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione logins e senhas para compartilhar com o cliente.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Arquivos compartilhados com o cliente
              </p>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button size="sm" asChild disabled={isUploadingFile}>
                    <span>
                      {isUploadingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      Upload
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {loadingFiles ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : files && files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const path = file.file_url.includes("/project-files/") 
                              ? file.file_url.split("/project-files/")[1] 
                              : file.file_url;
                            const { data } = await supabase.storage
                              .from("project-files")
                              .createSignedUrl(path, 3600);
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, "_blank");
                            } else {
                              toast.error("Erro ao gerar link");
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteFileMutation.mutate({ fileId: file.id, fileName: file.file_name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Nenhum arquivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de arquivos para compartilhar com o cliente.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            <TicketsList projectId={projectId!} userId={user?.id || ""} />
          </TabsContent>

          {/* Brand Tab */}
          {onboarding?.needs_brand_creation && (
            <TabsContent value="brand">
              <BrandManagementTab
                projectId={projectId!}
                clientId={project.client_id}
                onboarding={onboarding as any}
              />
            </TabsContent>
          )}

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Projeto</Label>
                  <Input value={project.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Domínio</Label>
                  <Input value={project.domain || ""} disabled placeholder="Não configurado" />
                </div>
                <div className="space-y-2">
                  <Label>Notas Internas</Label>
                  <Textarea 
                    value={project.notes || ""} 
                    placeholder="Adicione notas sobre este projeto..."
                    rows={4}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cloud Drive Link */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  Link do Cloud Drive
                </CardTitle>
                <CardDescription>
                  Insira o link completo (URL) para o Drive compartilhado com o cliente 
                  (Google Drive, Dropbox, etc.). Deixe vazio para não exibir o botão 
                  na interface do cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  value={cloudDriveUrl}
                  onChange={(e) => setCloudDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <Button onClick={handleSaveCloudDriveUrl} disabled={isSavingDriveUrl}>
                  {isSavingDriveUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Link do Drive
                </Button>
              </CardContent>
            </Card>

            {/* Admin-Only: Export Data */}
            {isAdmin && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Archive className="h-4 w-4 text-primary" />
                    Exportar Dados do Cliente
                  </CardTitle>
                  <CardDescription>
                    Baixe todos os dados deste cliente em um arquivo .zip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleDownloadClientData}
                    disabled={isDownloading}
                    className="w-full sm:w-auto"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Baixar Todos os Dados (.zip)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Inclui: onboarding, projetos, credenciais, arquivos, tickets, mensagens e notificações
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Log Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Ações</CardTitle>
                <CardDescription>Últimas ações realizadas neste projeto</CardDescription>
              </CardHeader>
              <CardContent>
                <ActionLogTimeline entityType="project" entityId={projectId || ''} limit={10} />
              </CardContent>
            </Card>

            {/* Developer-Only: Danger Zone */}
            {isDeveloper && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Zona de Perigo
                  </CardTitle>
                  <CardDescription className="text-destructive/80">
                    Ações irreversíveis - use com extremo cuidado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={`/admin/delete-client?client=${project?.client_id}`}>
                    <Button 
                      type="button"
                      variant="destructive" 
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Cliente e Todos os Dados
                    </Button>
                  </Link>
                  <p className="text-xs text-destructive/70 mt-2">
                    Remove permanentemente o cliente e todos os dados associados do sistema.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
    </AdminLayoutWithSidebar>
  );
}
