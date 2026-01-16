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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar as CalendarIcon, Loader2, Search, FileText, X, Clock, Upload, Image } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { logContentAction } from "@/services/auditService";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_isolated_page: boolean | null;
}

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  published: boolean;
  published_at: Date | null;
}

const initialFormData: PostFormData = { title: "", slug: "", excerpt: "", content: "", cover_image: "", category: "Site Profissional", published: false, published_at: null };

export default function AdminBlog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<PostFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "scheduled">("all");
  const [isUploading, setIsUploading] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .or("is_isolated_page.is.null,is_isolated_page.eq.false")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const publishedAt = data.published 
        ? (data.published_at ? data.published_at.toISOString() : new Date().toISOString())
        : null;
      const { error } = await supabase.from("blog_posts").insert({ 
        title: data.title, 
        slug: data.slug, 
        excerpt: data.excerpt || null, 
        content: data.content, 
        cover_image: data.cover_image || null, 
        category: data.category || "Site Profissional",
        published: data.published, 
        published_at: publishedAt, 
        author_id: user?.id,
        is_isolated_page: false
      });
      if (error) throw error;
      return data.slug;
    },
    onSuccess: async (slug) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] }); 
      
      // Audit log
      await logContentAction(slug, formData.title, false, 'create', `Post "${formData.title}" criado`);
      
      toast.success("Post criado!"); 
      resetForm(); 
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PostFormData }) => {
      const publishedAt = data.published 
        ? (data.published_at ? data.published_at.toISOString() : (editingPost?.published_at || new Date().toISOString()))
        : null;
      const { error } = await supabase.from("blog_posts").update({ 
        title: data.title, 
        slug: data.slug, 
        excerpt: data.excerpt || null, 
        content: data.content, 
        cover_image: data.cover_image || null, 
        category: data.category || "Site Profissional",
        published: data.published, 
        published_at: publishedAt
      }).eq("id", id);
      if (error) throw error;
      return { id, title: data.title };
    },
    onSuccess: async ({ id, title }) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] }); 
      
      // Audit log
      await logContentAction(id, title, false, 'update', `Post "${title}" atualizado`);
      
      toast.success("Post atualizado!"); 
      resetForm(); 
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (post: { id: string; title: string }) => { 
      const { error } = await supabase.from("blog_posts").delete().eq("id", post.id); 
      if (error) throw error;
      return post;
    },
    onSuccess: async (post) => { 
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] }); 
      
      // Audit log
      await logContentAction(post.id, post.title, false, 'delete', `Post "${post.title}" excluído`);
      
      toast.success("Post excluído!"); 
    },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("blog_posts").update({ published, published_at: published ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { published }) => { queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] }); toast.success(published ? "Publicado!" : "Despublicado!"); },
    onError: (error) => { toast.error("Erro: " + error.message); },
  });

  const resetForm = () => { setFormData(initialFormData); setEditingPost(null); setIsDialogOpen(false); };

  const openEditDialog = (post: BlogPost) => { 
    setEditingPost(post); 
    setFormData({ 
      title: post.title, 
      slug: post.slug, 
      excerpt: post.excerpt || "", 
      content: post.content, 
      cover_image: post.cover_image || "", 
      category: post.category || "Site Profissional",
      published: post.published || false,
      published_at: post.published_at ? new Date(post.published_at) : null
    }); 
    setIsDialogOpen(true); 
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) { toast.error("Preencha título, slug e conteúdo."); return; }
    if (editingPost) { updatePostMutation.mutate({ id: editingPost.id, data: formData }); } else { createPostMutation.mutate(formData); }
  };

  const generateSlug = (title: string) => title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const handleTitleChange = (title: string) => { setFormData(prev => ({ ...prev, title, slug: prev.slug || generateSlug(title) })); };

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
      const fileName = `blog-${Date.now()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-media')
        .getPublicUrl(filePath);

      // Save to media_files table
      await supabase.from('media_files').insert({
        file_name: fileName,
        display_name: file.name.replace(/\.[^/.]+$/, ""),
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: 'blog',
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

  const getPostStatus = (post: BlogPost): "published" | "draft" | "scheduled" => {
    if (!post.published) return "draft";
    if (post.published_at && isFuture(new Date(post.published_at))) return "scheduled";
    return "published";
  };

  const filteredPosts = posts?.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (statusFilter === "all") return true;
    return getPostStatus(post) === statusFilter;
  });

  const statusCounts = {
    all: posts?.length || 0,
    published: posts?.filter(p => getPostStatus(p) === "published").length || 0,
    draft: posts?.filter(p => getPostStatus(p) === "draft").length || 0,
    scheduled: posts?.filter(p => getPostStatus(p) === "scheduled").length || 0,
  };

  const isSaving = createPostMutation.isPending || updatePostMutation.isPending;

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Blog" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-display-sm font-display text-foreground mb-1 md:mb-2">Gerenciar Blog</h1>
          <p className="text-sm md:text-base text-muted-foreground">Crie, edite e publique artigos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild><Button onClick={openNewDialog}><Plus className="h-4 w-4 mr-2" />Novo Post</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingPost ? "Editar Post" : "Novo Post"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Título do artigo" /></div>
                <div className="space-y-2"><Label htmlFor="slug">Slug *</Label><Input id="slug" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} placeholder="url-do-artigo" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="excerpt">Resumo</Label><Textarea id="excerpt" value={formData.excerpt} onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))} placeholder="Breve descrição" rows={2} /></div>
              
              {/* Image upload section */}
              <div className="space-y-3">
                <Label>Imagem de Capa</Label>
                <div className="flex flex-col gap-3">
                  {/* Preview */}
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
                    {/* Upload button */}
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button type="button" variant="outline" className="w-full" disabled={isUploading} asChild>
                        <span>
                          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          {isUploading ? "Enviando..." : "Enviar imagem"}
                        </span>
                      </Button>
                    </label>
                    
                    {/* URL input */}
                    <div className="flex-1">
                      <Input 
                        id="cover_image" 
                        value={formData.cover_image} 
                        onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))} 
                        placeholder="ou cole a URL da imagem..." 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2"><Label htmlFor="category">Tag/Categoria</Label><Input id="category" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} placeholder="Ex: Site Profissional, SEO, Marketing..." /></div>
              <div className="space-y-2">
                <Label>Conteúdo *</Label>
                <BlogPostEditor 
                  value={formData.content} 
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))} 
                />
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Switch id="published" checked={formData.published} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))} />
                <Label htmlFor="published" className="cursor-pointer">Publicar imediatamente</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Data de Publicação</Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.published_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.published_at ? format(formData.published_at, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.published_at || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, published_at: date || null }))}
                        initialFocus
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.published_at && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, published_at: null }))}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.published_at && isFuture(formData.published_at) 
                    ? "⏰ Este post será agendado para publicação futura." 
                    : "Deixe vazio para usar a data atual ao publicar."}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingPost ? "Salvar" : "Criar"}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={statusFilter === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setStatusFilter("all")}
          >
            Todos ({statusCounts.all})
          </Button>
          <Button 
            variant={statusFilter === "published" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setStatusFilter("published")}
          >
            <Eye className="h-3 w-3 mr-1" />
            Publicados ({statusCounts.published})
          </Button>
          <Button 
            variant={statusFilter === "draft" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setStatusFilter("draft")}
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Rascunhos ({statusCounts.draft})
          </Button>
          <Button 
            variant={statusFilter === "scheduled" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setStatusFilter("scheduled")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Agendados ({statusCounts.scheduled})
          </Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filteredPosts && filteredPosts.length > 0 ? (
        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="group">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {post.cover_image ? <div className="w-full md:w-24 h-32 md:h-16 rounded-lg overflow-hidden flex-shrink-0"><img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" /></div> : <div className="w-full md:w-24 h-32 md:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><FileText className="h-6 w-6 text-muted-foreground" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground line-clamp-1">{post.title}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {getPostStatus(post) === "scheduled" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Agendado
                          </Badge>
                        ) : post.published ? (
                          <Badge variant="default">
                            <Eye className="h-3 w-3 mr-1" />
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Rascunho
                          </Badge>
                        )}
                      </div>
                    </div>
                    {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{post.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {post.published && post.published_at 
                          ? (isFuture(new Date(post.published_at)) 
                              ? `Agendado: ${format(new Date(post.published_at), "dd/MM/yyyy", { locale: ptBR })}` 
                              : format(new Date(post.published_at), "dd/MM/yyyy", { locale: ptBR }))
                          : format(new Date(post.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span>•</span>
                      <span>/blog/{post.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => togglePublishMutation.mutate({ id: post.id, published: !post.published })} disabled={togglePublishMutation.isPending}>{post.published ? <><EyeOff className="h-4 w-4 mr-1" />Despublicar</> : <><Eye className="h-4 w-4 mr-1" />Publicar</>}</Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(post)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir post?</AlertDialogTitle><AlertDialogDescription>O post "{post.title}" será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deletePostMutation.mutate({ id: post.id, title: post.title })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><h3 className="font-semibold text-foreground mb-2">{searchQuery ? "Nenhum post encontrado" : "Nenhum post criado ainda"}</h3><p className="text-sm text-muted-foreground mb-4">{searchQuery ? "Tente uma busca diferente." : "Comece criando seu primeiro artigo."}</p>{!searchQuery && <Button onClick={openNewDialog}><Plus className="h-4 w-4 mr-2" />Criar Primeiro Post</Button>}</CardContent></Card>
      )}
    </AdminLayoutWithSidebar>
  );
}
