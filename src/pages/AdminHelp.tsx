import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Eye, Search } from "lucide-react";
import HelpCategoryManager from "@/components/admin/HelpCategoryManager";
import HelpArticleEditor from "@/components/admin/HelpArticleEditor";
import { logAction } from "@/services/auditService";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category_id: string;
  display_order: number;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ArticleFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category_id: string;
  display_order: number;
  is_published: boolean;
}

export default function AdminHelp() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("articles");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState<ArticleFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category_id: "",
    display_order: 0,
    is_published: false,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["help-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("id, name, slug")
        .order("display_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["help-articles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Article[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ArticleFormData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("help_articles")
          .update({
            title: data.title,
            slug: data.slug,
            content: data.content,
            excerpt: data.excerpt || null,
            category_id: data.category_id,
            display_order: data.display_order,
            is_published: data.is_published,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("help_articles").insert({
          title: data.title,
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt || null,
          category_id: data.category_id,
          display_order: data.display_order,
          is_published: data.is_published,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["help-articles-admin"] });
      setIsDialogOpen(false);
      const isEdit = !!editingArticle;
      const articleTitle = variables.title;
      logAction({
        actionType: isEdit ? 'update' : 'create',
        entityType: 'help_article',
        entityId: variables.id,
        entityName: articleTitle,
        description: isEdit ? `Artigo "${articleTitle}" atualizado` : `Artigo "${articleTitle}" criado`,
      });
      setEditingArticle(null);
      resetForm();
      toast({ title: isEdit ? "Artigo atualizado" : "Artigo criado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("help_articles").delete().eq("id", id);
      if (error) throw error;
      return { id, title };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["help-articles-admin"] });
      logAction({
        actionType: 'delete',
        entityType: 'help_article',
        entityId: variables.id,
        entityName: variables.title,
        description: `Artigo "${variables.title}" excluído`,
      });
      toast({ title: "Artigo excluído" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category_id: categories[0]?.id || "",
      display_order: 0,
      is_published: false,
    });
  };

  const openNew = () => {
    resetForm();
    setEditingArticle(null);
    setIsDialogOpen(true);
  };

  const openEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt || "",
      category_id: article.category_id,
      display_order: article.display_order,
      is_published: article.is_published,
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingArticle ? prev.slug : generateSlug(title),
    }));
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "—";
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || article.category_id === filterCategory;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && article.is_published) ||
      (filterStatus === "draft" && !article.is_published);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Central de Ajuda" },
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Artigos
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Artigos de Ajuda</CardTitle>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Artigo
                </Button>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar artigos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="published">Publicados</SelectItem>
                      <SelectItem value="draft">Rascunhos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Articles list */}
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : filteredArticles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum artigo encontrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{article.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getCategoryName(article.category_id)} • {article.view_count} visualizações
                          </p>
                        </div>
                        <Badge variant={article.is_published ? "default" : "secondary"}>
                          {article.is_published ? "Publicado" : "Rascunho"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`/ajuda/${categories.find((c) => c.id === article.category_id)?.slug}/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(article)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate({ id: article.id, title: article.title })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <HelpCategoryManager />
          </TabsContent>
        </Tabs>

        {/* Article Editor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ ...formData, id: editingArticle?.id });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Ordem de exibição</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Resumo (opcional)</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={2}
                  placeholder="Breve descrição do artigo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <HelpArticleEditor
                  value={formData.content}
                  onChange={(v) => setFormData((prev) => ({ ...prev, content: v }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData((prev) => ({ ...prev, is_published: v }))}
                />
                <Label>Publicar artigo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayoutWithSidebar>
  );
}
