import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Search, FileText, X, Upload, ExternalLink } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logContentAction } from "@/services/auditService";

interface IsolatedPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  meta_description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
}

interface PageFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  published: boolean;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
}

const initialFormData: PageFormData = { 
  title: "", 
  slug: "", 
  excerpt: "", 
  content: "", 
  cover_image: "", 
  published: false,
  meta_description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  og_image: ""
};

export default function AdminPages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<IsolatedPage | null>(null);
  const [formData, setFormData] = useState<PageFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-isolated-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_isolated_page", true)
        .order("title", { ascending: true });
      if (error) throw error;
      return data as IsolatedPage[];
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: PageFormData) => {
      const { error } = await supabase.from("blog_posts").insert({ 
        title: data.title, 
        slug: data.slug, 
        excerpt: data.excerpt || null, 
        content: data.content, 
        cover_image: data.cover_image || null, 
        published: data.published, 
        published_at: data.published ? new Date().toISOString() : null,
        author_id: user?.id,
        is_isolated_page: true,
        meta_description: data.meta_description || null,
        keywords: data.keywords || null,
        og_title: data.og_title || null,
        og_description: data.og_description || null,
        og_image: data.og_image || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-isolated-pages"] }); 
      toast.success("Página criada!");
      logContentAction(variables.slug, variables.title, true, 'create', `Página "${variables.title}" criada`);
      resetForm(); 
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PageFormData }) => {
      const { error } = await supabase.from("blog_posts").update({ 
        title: data.title, 
        slug: data.slug, 
        excerpt: data.excerpt || null, 
        content: data.content, 
        cover_image: data.cover_image || null, 
        published: data.published,
        meta_description: data.meta_description || null,
        keywords: data.keywords || null,
        og_title: data.og_title || null,
        og_description: data.og_description || null,
        og_image: data.og_image || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-isolated-pages"] }); 
      toast.success("Página atualizada!");
      logContentAction(variables.id, variables.data.title, true, 'update', `Página "${variables.data.title}" atualizada`);
      resetForm(); 
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const deletePageMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => { 
      const { error } = await supabase.from("blog_posts").delete().eq("id", id); 
      if (error) throw error;
      return { id, title };
    },
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-isolated-pages"] }); 
      toast.success("Página excluída!");
      logContentAction(variables.id, variables.title, true, 'delete', `Página "${variables.title}" excluída`);
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published, title }: { id: string; published: boolean; title: string }) => {
      const { error } = await supabase.from("blog_posts").update({ 
        published, 
        published_at: published ? new Date().toISOString() : null 
      }).eq("id", id);
      if (error) throw error;
      return { id, published, title };
    },
    onSuccess: (_, { published, id, title }) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-isolated-pages"] }); 
      toast.success(published ? "Publicada!" : "Despublicada!");
      logContentAction(id, title, true, 'status_change', `Página "${title}" ${published ? 'publicada' : 'despublicada'}`);
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const resetForm = () => { 
    setFormData(initialFormData); 
    setEditingPage(null); 
    setIsDialogOpen(false); 
  };

  const openEditDialog = (page: IsolatedPage) => { 
    setEditingPage(page); 
    setFormData({ 
      title: page.title, 
      slug: page.slug, 
      excerpt: page.excerpt || "", 
      content: page.content, 
      cover_image: page.cover_image || "", 
      published: page.published || false,
      meta_description: page.meta_description || "",
      keywords: page.keywords || "",
      og_title: page.og_title || "",
      og_description: page.og_description || "",
      og_image: page.og_image || "",
    }); 
    setIsDialogOpen(true); 
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) { 
      toast.error("Preencha título, slug e conteúdo."); 
      return; 
    }
    if (editingPage) { 
      updatePageMutation.mutate({ id: editingPage.id, data: formData }); 
    } else { 
      createPageMutation.mutate(formData); 
    }
  };

  const generateSlug = (title: string) => title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const handleTitleChange = (title: string) => { 
    setFormData(prev => ({ 
      ...prev, 
      title, 
      slug: prev.slug || generateSlug(title) 
    })); 
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG, WebP, GIF ou SVG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `page-${Date.now()}.${fileExt}`;
      const filePath = `pages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-media')
        .getPublicUrl(filePath);

      await supabase.from('media_files').insert({
        file_name: fileName,
        display_name: file.name.replace(/\.[^/.]+$/, ""),
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: 'pages',
        uploaded_by: user?.id
      });

      setFormData(prev => ({ ...prev, cover_image: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const filteredPages = pages?.filter((page) => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSaving = createPageMutation.isPending || updatePageMutation.isPending;

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Páginas" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1 md:mb-2">Gerenciar Páginas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Crie e edite páginas isoladas como Termos, Privacidade, Sobre, etc.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}><Plus className="h-4 w-4 mr-2" />Nova Página</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingPage ? "Editar Página" : "Nova Página"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Título da página" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/</span>
                    <Input id="slug" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} placeholder="url-da-pagina" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="excerpt">Descrição curta</Label>
                <Textarea id="excerpt" value={formData.excerpt} onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))} placeholder="Breve descrição da página" rows={2} />
              </div>
              
              {/* Image upload section */}
              <div className="space-y-3">
                <Label>Imagem de Capa (opcional)</Label>
                <div className="flex flex-col gap-3">
                  {formData.cover_image && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted">
                      <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover" />
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => setFormData(prev => ({ ...prev, cover_image: "" }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                      <Button type="button" variant="outline" className="w-full" disabled={isUploading} asChild>
                        <span>
                          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          {isUploading ? "Enviando..." : "Enviar imagem"}
                        </span>
                      </Button>
                    </label>
                    <div className="flex-1">
                      <Input value={formData.cover_image} onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))} placeholder="ou cole a URL da imagem..." />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conteúdo *</Label>
                <BlogPostEditor value={formData.content} onChange={(content) => setFormData(prev => ({ ...prev, content }))} />
              </div>

              {/* SEO Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-4">Configurações de SEO</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea id="meta_description" value={formData.meta_description} onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))} placeholder="Descrição para mecanismos de busca (150-160 caracteres)" rows={2} />
                    <p className="text-xs text-muted-foreground">{formData.meta_description.length}/160 caracteres</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Palavras-chave</Label>
                    <Input id="keywords" value={formData.keywords} onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))} placeholder="palavra1, palavra2, palavra3" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="og_title">OG Title (redes sociais)</Label>
                      <Input id="og_title" value={formData.og_title} onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))} placeholder="Deixe vazio para usar o título" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="og_image">OG Image URL</Label>
                      <Input id="og_image" value={formData.og_image} onChange={(e) => setFormData(prev => ({ ...prev, og_image: e.target.value }))} placeholder="URL da imagem para redes sociais" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="og_description">OG Description</Label>
                    <Textarea id="og_description" value={formData.og_description} onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))} placeholder="Deixe vazio para usar a meta description" rows={2} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Switch id="published" checked={formData.published} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))} />
                <Label htmlFor="published" className="cursor-pointer">Publicar página</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPage ? "Salvar Alterações" : "Criar Página"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar páginas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary">{filteredPages?.length || 0} páginas</Badge>
      </div>

      {/* Pages List */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filteredPages?.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">Nenhuma página encontrada.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredPages?.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{page.title}</h3>
                      {page.published ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Publicada</Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {page.published && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => togglePublishMutation.mutate({ id: page.id, published: !page.published, title: page.title })}>
                      {page.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(page)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir página?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. A página "{page.title}" será permanentemente removida.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePageMutation.mutate({ id: page.id, title: page.title })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayoutWithSidebar>
  );
}
