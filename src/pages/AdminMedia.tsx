import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  Copy, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  FileImage,
  Pencil,
  Check,
  X,
  ExternalLink,
  Palette
} from "lucide-react";
import { logAction } from "@/services/auditService";

interface MediaFile {
  id: string;
  file_name: string;
  display_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
}

const DEVELOPER_EMAIL = "desenvolvedor@webq.com.br";
const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "logo", label: "Logos" },
  { value: "blog-cover", label: "Capas de Blog" },
  { value: "general", label: "Geral" },
];

export default function AdminMedia() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Check if user is developer
  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  useEffect(() => {
    if (!isDeveloper) {
      navigate("/admin/dashboard");
      return;
    }
    fetchFiles();
  }, [isDeveloper, navigate]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("media_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching media files:", error);
      toast({
        title: "Erro ao carregar arquivos",
        description: "Não foi possível carregar a biblioteca de mídia.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não permitido",
          description: "Apenas SVG, PNG, JPG, WEBP e GIF são permitidos.",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 10MB.",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(file);
      setUploadDisplayName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadDisplayName.trim()) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = uploadFile.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${uploadCategory}/${uniqueName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("admin-media")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("admin-media")
        .getPublicUrl(filePath);

      // Save metadata to database
      const { error: dbError } = await supabase.from("media_files").insert({
        file_name: uploadFile.name,
        display_name: uploadDisplayName.trim(),
        file_url: urlData.publicUrl,
        file_type: fileExt?.toUpperCase() || null,
        file_size: uploadFile.size,
        category: uploadCategory,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;

      toast({
        title: "Arquivo enviado",
        description: "O arquivo foi adicionado à biblioteca de mídia.",
      });

      // Log audit
      await logAction({
        actionType: 'upload',
        entityType: 'media_file',
        entityName: uploadDisplayName.trim(),
        description: `Arquivo "${uploadDisplayName.trim()}" enviado para a biblioteca de mídia`,
        metadata: { category: uploadCategory, file_type: fileExt?.toUpperCase() },
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadDisplayName("");
      setUploadCategory("general");
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: "Não foi possível fazer upload do arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado",
      description: "O link foi copiado para a área de transferência.",
    });
  }, [toast]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const fileToDelete = files.find((f) => f.id === deleteId);
      if (!fileToDelete) return;

      // Extract file path from URL
      const urlParts = fileToDelete.file_url.split("/admin-media/");
      const filePath = urlParts[1];

      // Delete from storage
      if (filePath) {
        await supabase.storage.from("admin-media").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase.from("media_files").delete().eq("id", deleteId);
      if (error) throw error;

      // Log audit
      await logAction({
        actionType: 'delete',
        entityType: 'media_file',
        entityId: deleteId,
        entityName: fileToDelete.display_name,
        description: `Arquivo "${fileToDelete.display_name}" excluído da biblioteca de mídia`,
      });

      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi removido da biblioteca de mídia.",
      });

      setDeleteId(null);
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Erro ao excluir arquivo",
        description: "Não foi possível excluir o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async (id: string, oldName: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("media_files")
        .update({ display_name: editingName.trim() })
        .eq("id", id);

      if (error) throw error;

      // Log audit
      await logAction({
        actionType: 'update',
        entityType: 'media_file',
        entityId: id,
        entityName: editingName.trim(),
        description: `Arquivo renomeado de "${oldName}" para "${editingName.trim()}"`,
        oldValue: { display_name: oldName },
        newValue: { display_name: editingName.trim() },
      });

      toast({
        title: "Nome atualizado",
        description: "O nome do arquivo foi atualizado.",
      });

      setEditingId(null);
      fetchFiles();
    } catch (error) {
      console.error("Error renaming file:", error);
      toast({
        title: "Erro ao renomear",
        description: "Não foi possível renomear o arquivo.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (file: MediaFile) => {
    setEditingId(file.id);
    setEditingName(file.display_name);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (!isDeveloper) {
    return null;
  }

  const breadcrumbs = [
    { label: "Admin", href: "/admin/dashboard" },
    { label: "Mídia" },
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Biblioteca de Mídia
            </h1>
            <p className="text-muted-foreground">
              Gerencie logos, capas de blog e outros arquivos de mídia.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/brand-guidelines")}>
              <Palette className="h-4 w-4 mr-2" />
              Brand Guidelines
            </Button>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Arquivo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Files Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery || categoryFilter !== "all"
                  ? "Nenhum arquivo encontrado com esses filtros."
                  : "Nenhum arquivo na biblioteca. Envie seu primeiro arquivo!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="overflow-hidden group">
                {/* Image Preview */}
                <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {file.file_type === "SVG" ? (
                    <div className="w-full h-full p-4 flex items-center justify-center">
                      <img
                        src={file.file_url}
                        alt={file.display_name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <img
                      src={file.file_url}
                      alt={file.display_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyLink(file.file_url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(file.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* File Info */}
                <CardContent className="p-3 space-y-2">
                  {editingId === file.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(file.id, file.display_name);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRename(file.id, file.display_name)}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate flex-1" title={file.display_name}>
                        {file.display_name}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(file)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type || "—"}
                    </Badge>
                    <span>{formatFileSize(file.file_size)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
            <DialogDescription>
              Envie logos, capas de blog ou outros arquivos de mídia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Arquivo</Label>
              {uploadFile ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.size)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setUploadFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar ou arraste um arquivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      SVG, PNG, JPG, WEBP, GIF (max. 10MB)
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Nome de exibição</Label>
              <Input
                id="display-name"
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                placeholder="Nome para identificar o arquivo"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="blog-cover">Capa de Blog</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadDisplayName.trim() || isUploading}
            >
              {isUploading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Arquivo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayoutWithSidebar>
  );
}
