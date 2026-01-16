import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FolderOpen, File, Image, FileArchive, Upload, Loader2, Cloud } from "lucide-react";
import { toast } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { notifyNewFile } from "@/services/notificationService";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive")) return FileArchive;
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) return FileText;
  return File;
};

export default function ClientProjectFiles() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["client-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: files, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // Extract path from full URL if needed
      const path = filePath.includes("/project-files/") 
        ? filePath.split("/project-files/")[1] 
        : filePath;
      
      const { data, error } = await supabase.storage
        .from("project-files")
        .createSignedUrl(path, 3600); // URL válida por 1 hora

      if (error || !data?.signedUrl) {
        toast.error("Erro ao gerar link de download");
        return;
      }

      window.open(data.signedUrl, "_blank");
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !user) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB");
      e.target.value = "";
      return;
    }

    // Validate file type (block executable files)
    const blockedExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dll', 'scr'];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || '';
    if (blockedExtensions.includes(fileExt)) {
      toast.error("Tipo de arquivo não permitido por segurança");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${projectId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) for signed URL generation
      const { error: insertError } = await supabase.from("project_files").insert({
        project_id: projectId,
        file_name: file.name,
        file_url: fileName, // Store path, not public URL
        file_type: fileExt,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      // Try to notify admins, but don't fail the upload if it fails
      try {
        const clientName = profile?.full_name || profile?.company_name || "Cliente";
        await notifyNewFile(projectId!, project?.name || "Projeto", file.name, clientName, fileExt);
      } catch (notifyError) {
        console.warn("Notification failed (non-critical):", notifyError);
      }

      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: project?.name || "Projeto", href: `/cliente/dashboard` },
    { label: "Arquivos" }
  ];

  if (isLoadingProject || isLoadingFiles) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </ClientLayout>
    );
  }

  if (!project) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Projeto não encontrado.</p>
            <Button asChild className="mt-4">
              <Link to="/cliente/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  const uploadButton = (
    <div className="relative">
      <input
        type="file"
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      <Button variant="outline" size="sm" disabled={isUploading}>
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Enviar arquivo
          </>
        )}
      </Button>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {project.cloud_drive_url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm"
              onClick={() => window.open(project.cloud_drive_url!, "_blank")}
            >
              <Cloud className="h-4 w-4 mr-2" />
              Acessar Drive do Projeto
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Acesse os arquivos do projeto compartilhados pelo time criativo via nuvem
          </TooltipContent>
        </Tooltip>
      )}
      {uploadButton}
    </div>
  );

  return (
    <ClientLayout 
      breadcrumbs={breadcrumbs} 
      title={`Arquivos - ${project.name}`}
      headerActions={headerActions}
    >
      {/* Bloco descritivo */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Central de Arquivos do Projeto
        </h3>
        <p className="text-sm text-muted-foreground">
          {project.cloud_drive_url ? (
            <>
              Utilize esta área para gerenciar os documentos e materiais do seu projeto. 
              Você pode <strong className="text-foreground">enviar arquivos brutos</strong> para 
              o nosso time criativo através do botão "Enviar arquivo" e{" "}
              <strong className="text-foreground">baixar os materiais finais e editados</strong> do 
              seu site listados abaixo. Para arquivos em nuvem compartilhados pelo time, 
              use o botão "Acessar Drive do Projeto".
            </>
          ) : (
            <>
              Utilize esta área para gerenciar os documentos e materiais do seu projeto. 
              Você pode <strong className="text-foreground">enviar arquivos brutos</strong> para 
              o nosso time criativo através do botão "Enviar arquivo" e{" "}
              <strong className="text-foreground">baixar os materiais finais e editados</strong> do 
              seu site listados abaixo.
            </>
          )}
        </p>
      </div>

      {files && files.length > 0 ? (
        <div className="grid gap-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.file_type);
            return (
              <Card key={file.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">
                          {file.file_name}
                        </h3>
                        {file.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {file.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(file.created_at), "dd 'de' MMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.file_url, file.file_name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum arquivo disponível
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Os arquivos compartilhados do seu projeto aparecerão aqui assim que forem
              disponibilizados pela equipe WebQ.
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  );
}
