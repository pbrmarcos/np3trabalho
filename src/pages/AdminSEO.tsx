import { useState, useMemo } from "react";
import { useAllPageSEO, PageSEO } from "@/hooks/usePageSEO";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Pencil, CheckCircle2, Globe, ExternalLink, AlertTriangle, XCircle, Info, Sparkles, Loader2, Lightbulb, ArrowRight, FileText, RefreshCw, Plus, HelpCircle } from "lucide-react";

interface SEOAnalysis {
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
  }>;
}

interface SEOSuggestion {
  type: 'title' | 'description' | 'keywords' | 'general';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  example?: string;
}

interface AISuggestions {
  suggestions: SEOSuggestion[];
  improvedTitle?: string;
  improvedDescription?: string;
}

function analyzeSEO(title: string, description: string, keywords: string): SEOAnalysis {
  const issues: SEOAnalysis['issues'] = [];
  let score = 100;

  const titleLength = title.length;
  if (titleLength === 0) {
    issues.push({ type: 'error', message: 'Título não definido' });
    score -= 30;
  } else if (titleLength < 30) {
    issues.push({ type: 'warning', message: `Título muito curto (${titleLength} caracteres). Recomendado: 50-60` });
    score -= 15;
  } else if (titleLength > 60) {
    issues.push({ type: 'warning', message: `Título muito longo (${titleLength} caracteres). Será cortado nos resultados` });
    score -= 10;
  } else if (titleLength >= 50 && titleLength <= 60) {
    issues.push({ type: 'success', message: `Título com tamanho ideal (${titleLength} caracteres)` });
  } else {
    issues.push({ type: 'info', message: `Título com ${titleLength} caracteres (ideal: 50-60)` });
  }

  const descLength = description.length;
  if (descLength === 0) {
    issues.push({ type: 'error', message: 'Meta description não definida' });
    score -= 25;
  } else if (descLength < 120) {
    issues.push({ type: 'warning', message: `Descrição muito curta (${descLength} caracteres). Recomendado: 150-160` });
    score -= 15;
  } else if (descLength > 160) {
    issues.push({ type: 'warning', message: `Descrição muito longa (${descLength} caracteres). Será cortada nos resultados` });
    score -= 10;
  } else if (descLength >= 150 && descLength <= 160) {
    issues.push({ type: 'success', message: `Descrição com tamanho ideal (${descLength} caracteres)` });
  } else {
    issues.push({ type: 'info', message: `Descrição com ${descLength} caracteres (ideal: 150-160)` });
  }

  if (keywords) {
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    const keywordsInTitle = keywordList.filter(k => titleLower.includes(k));
    const keywordsInDesc = keywordList.filter(k => descLower.includes(k));
    
    if (keywordList.length > 0) {
      if (keywordsInTitle.length === 0) {
        issues.push({ type: 'warning', message: 'Nenhuma palavra-chave encontrada no título' });
        score -= 10;
      } else {
        issues.push({ type: 'success', message: `${keywordsInTitle.length} palavra(s)-chave no título` });
      }
      
      if (keywordsInDesc.length === 0) {
        issues.push({ type: 'warning', message: 'Nenhuma palavra-chave encontrada na descrição' });
        score -= 10;
      } else {
        issues.push({ type: 'success', message: `${keywordsInDesc.length} palavra(s)-chave na descrição` });
      }
    }
  } else {
    issues.push({ type: 'info', message: 'Defina palavras-chave para análise completa' });
  }

  if (title && !title.includes(' ')) {
    issues.push({ type: 'warning', message: 'Título deve conter múltiplas palavras' });
    score -= 5;
  }

  if (description && !description.includes('.')) {
    issues.push({ type: 'info', message: 'Considere usar frases completas na descrição' });
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-600 border-red-200';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
    case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

// Default SEO suggestions for automatic filling
function getDefaultSEO(pageKey: string, pageName: string, route: string): { title: string; description: string; keywords: string } {
  const defaults: Record<string, { title: string; description: string; keywords: string }> = {
    home: {
      title: 'WebQ - Sites Profissionais para Empresas',
      description: 'Crie seu site profissional com hospedagem, e-mails e suporte dedicado. Planos a partir de R$149/mês. Transforme sua presença digital.',
      keywords: 'site profissional, criação de site, hospedagem, site empresarial, webq'
    },
    plans: {
      title: 'Planos e Preços | Sites Profissionais - WebQ',
      description: 'Compare nossos planos de sites profissionais: Essencial, Profissional e Performance. Hospedagem, e-mails e suporte inclusos.',
      keywords: 'planos site, preços site, hospedagem site, site profissional preço'
    },
    blog: {
      title: 'Blog | Dicas e Novidades sobre Sites - WebQ',
      description: 'Artigos sobre criação de sites, marketing digital, SEO e dicas para empresas. Mantenha-se atualizado com as tendências do mercado.',
      keywords: 'blog site, marketing digital, seo, dicas empresas'
    },
    help: {
      title: 'Central de Ajuda | Suporte - WebQ',
      description: 'Encontre respostas para suas dúvidas sobre sites, hospedagem, e-mails e mais. Tutoriais e guias completos para clientes WebQ.',
      keywords: 'ajuda, suporte, tutorial, guia, central de ajuda'
    },
    design: {
      title: 'Serviços de Design Digital | WebQ',
      description: 'Criação de marca, artes para redes sociais, papelaria digital e mais. Serviços de design profissional para sua empresa.',
      keywords: 'design, criação de marca, redes sociais, design digital'
    },
    migration: {
      title: 'Migração de Sites | Transfira seu Site - WebQ',
      description: 'Migre seu site para a WebQ sem complicações. Nossa equipe cuida de todo o processo técnico para você.',
      keywords: 'migração site, transferir site, mudar hospedagem'
    },
    signup: {
      title: 'Cadastro | Crie sua Conta - WebQ',
      description: 'Crie sua conta na WebQ e comece a utilizar nossos serviços de design e sites profissionais.',
      keywords: 'cadastro, criar conta, webq'
    },
    client_login: {
      title: 'Portal do Cliente | Login - WebQ',
      description: 'Acesse o portal do cliente para gerenciar seu site, tickets de suporte e informações da conta.',
      keywords: 'login, portal cliente, acesso'
    },
    forgot_password: {
      title: 'Recuperar Senha | WebQ',
      description: 'Esqueceu sua senha? Recupere o acesso à sua conta WebQ de forma rápida e segura.',
      keywords: 'recuperar senha, esqueci senha, resetar senha'
    },
    admin_login: {
      title: 'Admin | WebQ',
      description: 'Painel administrativo WebQ.',
      keywords: 'admin, painel'
    },
  };
  
  // Default for help category pages
  if (pageKey.startsWith('help_')) {
    const categoryName = pageName.replace('Ajuda - ', '');
    return {
      title: `${categoryName} | Central de Ajuda - WebQ`,
      description: `Encontre guias e tutoriais sobre ${categoryName}. Tire suas dúvidas na Central de Ajuda da WebQ.`,
      keywords: `ajuda, ${categoryName.toLowerCase()}, tutorial, guia, suporte`
    };
  }
  
  return defaults[pageKey] || {
    title: `${pageName} - WebQ`,
    description: `Acesse ${pageName} na WebQ. Sites profissionais e serviços digitais para sua empresa.`,
    keywords: 'webq, site profissional'
  };
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published: boolean | null;
  meta_description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  is_isolated_page: boolean | null;
}

interface BlogFormData {
  title: string;
  excerpt: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
}

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  is_published: boolean | null;
  meta_description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  category_id: string;
}

interface HelpArticleFormData {
  title: string;
  excerpt: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
}

export default function AdminSEO() {
  const { data: pages, isLoading } = useAllPageSEO();
  
  // Query for regular blog posts (not isolated pages)
  const { data: blogPosts, isLoading: isLoadingBlog } = useQuery({
    queryKey: ['blog-posts-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, published, meta_description, keywords, og_title, og_description, og_image, is_isolated_page')
        .or('is_isolated_page.is.null,is_isolated_page.eq.false')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Query for isolated pages
  const { data: isolatedPages, isLoading: isLoadingIsolated } = useQuery({
    queryKey: ['isolated-pages-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, published, meta_description, keywords, og_title, og_description, og_image, is_isolated_page')
        .eq('is_isolated_page', true)
        .order('title', { ascending: true });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Query for help articles
  const { data: helpArticles, isLoading: isLoadingHelp } = useQuery({
    queryKey: ['help-articles-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, title, slug, excerpt, is_published, meta_description, keywords, og_title, og_description, og_image, category_id')
        .order('title', { ascending: true });
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  // Query for help categories (for dynamic routes)
  const { data: helpCategories } = useQuery({
    queryKey: ['help-categories-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const [editingPage, setEditingPage] = useState<PageSEO | null>(null);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [editingHelpArticle, setEditingHelpArticle] = useState<HelpArticle | null>(null);
  const [formData, setFormData] = useState<Partial<PageSEO>>({});
  const [blogFormData, setBlogFormData] = useState<BlogFormData>({ 
    title: '', 
    excerpt: '', 
    meta_description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    og_image: ''
  });
  const [helpFormData, setHelpFormData] = useState<HelpArticleFormData>({ 
    title: '', 
    excerpt: '', 
    meta_description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    og_image: ''
  });
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [missingPages, setMissingPages] = useState<Array<{key: string, name: string, route: string}>>([]);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const queryClient = useQueryClient();

  // Define all public pages that should have SEO entries (expanded list)
  const publicPagesDefinition = useMemo(() => {
    const basePages = [
      { key: 'home', name: 'Página Inicial', route: '/' },
      { key: 'plans', name: 'Planos', route: '/planos' },
      { key: 'blog', name: 'Blog', route: '/blog' },
      { key: 'help', name: 'Central de Ajuda', route: '/ajuda' },
      { key: 'design', name: 'Catálogo de Design', route: '/design' },
      { key: 'migration', name: 'Migração de Sites', route: '/migracao' },
      { key: 'signup', name: 'Cadastro', route: '/cadastro' },
      { key: 'client_login', name: 'Login Cliente', route: '/cliente' },
      { key: 'forgot_password', name: 'Esqueci a Senha', route: '/esqueci-senha' },
      { key: 'admin_login', name: 'Login Admin', route: '/admin' },
    ];

    // Add help category pages dynamically
    const helpCategoryPages = (helpCategories || []).map(cat => ({
      key: `help_${cat.slug.replace(/-/g, '_')}`,
      name: `Ajuda - ${cat.name}`,
      route: `/ajuda/${cat.slug}`
    }));

    return [...basePages, ...helpCategoryPages];
  }, [helpCategories]);

  const scanForMissingPages = () => {
    setIsScanning(true);
    const existingKeys = pages?.map(p => p.page_key) || [];
    const missing = publicPagesDefinition.filter(p => !existingKeys.includes(p.key));
    setMissingPages(missing);
    setShowScanDialog(true);
    setIsScanning(false);
  };

  const createPagesMutation = useMutation({
    mutationFn: async (pagesToCreate: Array<{key: string, name: string, route: string}>) => {
      const inserts = pagesToCreate.map(p => {
        const defaultSEO = getDefaultSEO(p.key, p.name, p.route);
        return {
          page_key: p.key,
          page_name: p.name,
          page_route: p.route,
          title: defaultSEO.title,
          meta_description: defaultSEO.description,
          keywords: defaultSEO.keywords,
        };
      });
      
      const { error } = await supabase
        .from('page_seo')
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-seo'] });
      toast.success(`${missingPages.length} página(s) cadastrada(s) com SEO padrão!`);
      setShowScanDialog(false);
      setMissingPages([]);
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar páginas: " + error.message);
    },
  });

  const seoAnalysis = useMemo(() => {
    return analyzeSEO(
      formData.title || '',
      formData.meta_description || '',
      formData.keywords || ''
    );
  }, [formData.title, formData.meta_description, formData.keywords]);

  const blogSeoAnalysis = useMemo(() => {
    return analyzeSEO(
      blogFormData.title || '',
      blogFormData.meta_description || blogFormData.excerpt || '',
      blogFormData.keywords || ''
    );
  }, [blogFormData.title, blogFormData.meta_description, blogFormData.excerpt, blogFormData.keywords]);

  const helpSeoAnalysis = useMemo(() => {
    return analyzeSEO(
      helpFormData.title || '',
      helpFormData.meta_description || helpFormData.excerpt || '',
      helpFormData.keywords || ''
    );
  }, [helpFormData.title, helpFormData.meta_description, helpFormData.excerpt, helpFormData.keywords]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PageSEO> & { id: string }) => {
      const { error } = await supabase
        .from('page_seo')
        .update({
          title: data.title,
          meta_description: data.meta_description,
          og_title: data.og_title,
          og_description: data.og_description,
          og_image: data.og_image,
          keywords: data.keywords,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-seo'] });
      toast.success("SEO atualizado com sucesso!");
      setEditingPage(null);
      setAiSuggestions(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar SEO: " + error.message);
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: async (data: { id: string } & BlogFormData) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: data.title,
          excerpt: data.excerpt,
          meta_description: data.meta_description || null,
          keywords: data.keywords || null,
          og_title: data.og_title || null,
          og_description: data.og_description || null,
          og_image: data.og_image || null,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts-seo'] });
      toast.success("SEO do artigo atualizado!");
      setEditingBlogPost(null);
      setAiSuggestions(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Help article mutation
  const updateHelpMutation = useMutation({
    mutationFn: async (data: { id: string } & HelpArticleFormData) => {
      const { error } = await supabase
        .from('help_articles')
        .update({
          title: data.title,
          excerpt: data.excerpt || null,
          meta_description: data.meta_description || null,
          keywords: data.keywords || null,
          og_title: data.og_title || null,
          og_description: data.og_description || null,
          og_image: data.og_image || null,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles-seo'] });
      toast.success("SEO do artigo de ajuda atualizado!");
      setEditingHelpArticle(null);
      setAiSuggestions(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleEdit = (page: PageSEO) => {
    setEditingPage(page);
    setFormData({
      title: page.title || '',
      meta_description: page.meta_description || '',
      og_title: page.og_title || '',
      og_description: page.og_description || '',
      og_image: page.og_image || '',
      keywords: page.keywords || '',
    });
    setAiSuggestions(null);
  };

  const handleSave = () => {
    if (!editingPage) return;
    updateMutation.mutate({ id: editingPage.id, ...formData });
  };

  const handleGetAISuggestions = async () => {
    if (!editingPage) return;
    
    setIsLoadingAI(true);
    setAiSuggestions(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('seo-suggestions', {
        body: {
          title: formData.title || '',
          description: formData.meta_description || '',
          keywords: formData.keywords || '',
          pageName: editingPage.page_name,
          pageRoute: editingPage.page_route,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAiSuggestions(data);
      toast.success("Sugestões geradas com sucesso!");
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyImprovedTitle = () => {
    if (aiSuggestions?.improvedTitle) {
      setFormData(prev => ({ ...prev, title: aiSuggestions.improvedTitle }));
      toast.success("Título aplicado!");
    }
  };

  const applyImprovedDescription = () => {
    if (aiSuggestions?.improvedDescription) {
      setFormData(prev => ({ ...prev, meta_description: aiSuggestions.improvedDescription }));
      toast.success("Descrição aplicada!");
    }
  };

  const getStatusBadge = (page: PageSEO) => {
    const analysis = analyzeSEO(page.title || '', page.meta_description || '', page.keywords || '');
    
    if (analysis.score >= 80) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    if (analysis.score >= 60) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
  };

  const getBlogStatusBadge = (post: BlogPost) => {
    const analysis = analyzeSEO(
      post.title || '', 
      post.meta_description || post.excerpt || '', 
      post.keywords || ''
    );
    
    if (analysis.score >= 80) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    if (analysis.score >= 60) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
  };

  const handleEditBlog = (post: BlogPost) => {
    setEditingBlogPost(post);
    setBlogFormData({
      title: post.title || '',
      excerpt: post.excerpt || '',
      meta_description: post.meta_description || '',
      keywords: post.keywords || '',
      og_title: post.og_title || '',
      og_description: post.og_description || '',
      og_image: post.og_image || '',
    });
    setAiSuggestions(null);
  };

  const handleSaveBlog = () => {
    if (!editingBlogPost) return;
    updateBlogMutation.mutate({ id: editingBlogPost.id, ...blogFormData });
  };

  const handleGetBlogAISuggestions = async () => {
    if (!editingBlogPost) return;
    
    setIsLoadingAI(true);
    setAiSuggestions(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('seo-suggestions', {
        body: {
          title: blogFormData.title || '',
          description: blogFormData.meta_description || blogFormData.excerpt || '',
          keywords: blogFormData.keywords || '',
          pageName: 'Artigo do Blog',
          pageRoute: `/blog/${editingBlogPost.slug}`,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAiSuggestions(data);
      toast.success("Sugestões geradas com sucesso!");
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyBlogImprovedTitle = () => {
    if (aiSuggestions?.improvedTitle) {
      setBlogFormData(prev => ({ ...prev, title: aiSuggestions.improvedTitle! }));
      toast.success("Título aplicado!");
    }
  };

  const applyBlogImprovedDescription = () => {
    if (aiSuggestions?.improvedDescription) {
      setBlogFormData(prev => ({ ...prev, meta_description: aiSuggestions.improvedDescription! }));
      toast.success("Descrição aplicada!");
    }
  };

  // Help article handlers
  const getHelpStatusBadge = (article: HelpArticle) => {
    const analysis = analyzeSEO(
      article.title || '', 
      article.meta_description || article.excerpt || '', 
      article.keywords || ''
    );
    
    if (analysis.score >= 80) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    if (analysis.score >= 60) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{analysis.score}%</Badge>;
  };

  const handleEditHelp = (article: HelpArticle) => {
    setEditingHelpArticle(article);
    setHelpFormData({
      title: article.title || '',
      excerpt: article.excerpt || '',
      meta_description: article.meta_description || '',
      keywords: article.keywords || '',
      og_title: article.og_title || '',
      og_description: article.og_description || '',
      og_image: article.og_image || '',
    });
    setAiSuggestions(null);
  };

  const handleSaveHelp = () => {
    if (!editingHelpArticle) return;
    updateHelpMutation.mutate({ id: editingHelpArticle.id, ...helpFormData });
  };

  const handleGetHelpAISuggestions = async () => {
    if (!editingHelpArticle) return;
    
    setIsLoadingAI(true);
    setAiSuggestions(null);
    
    try {
      const categorySlug = helpCategories?.find(c => c.id === editingHelpArticle.category_id)?.slug || '';
      const { data, error } = await supabase.functions.invoke('seo-suggestions', {
        body: {
          title: helpFormData.title || '',
          description: helpFormData.meta_description || helpFormData.excerpt || '',
          keywords: helpFormData.keywords || '',
          pageName: 'Artigo de Ajuda',
          pageRoute: `/ajuda/${categorySlug}/${editingHelpArticle.slug}`,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAiSuggestions(data);
      toast.success("Sugestões geradas com sucesso!");
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyHelpImprovedTitle = () => {
    if (aiSuggestions?.improvedTitle) {
      setHelpFormData(prev => ({ ...prev, title: aiSuggestions.improvedTitle! }));
      toast.success("Título aplicado!");
    }
  };

  const applyHelpImprovedDescription = () => {
    if (aiSuggestions?.improvedDescription) {
      setHelpFormData(prev => ({ ...prev, meta_description: aiSuggestions.improvedDescription! }));
      toast.success("Descrição aplicada!");
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin" },
    { label: "SEO" },
  ];

  const truncateTitle = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const truncateDescription = (text: string, maxLength: number = 160) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6" />
            Gerenciamento de SEO
          </h1>
          <p className="text-muted-foreground">
            Configure títulos, descrições e metadados para as páginas públicas e artigos
          </p>
        </div>

        <Tabs defaultValue="pages" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="pages" className="gap-2">
              <Globe className="w-4 h-4" />
              Páginas Públicas
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <FileText className="w-4 h-4" />
              Artigos do Blog
            </TabsTrigger>
            <TabsTrigger value="isolated" className="gap-2">
              <FileText className="w-4 h-4" />
              Páginas Isoladas
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              Artigos de Ajuda
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Páginas Públicas</CardTitle>
                  <CardDescription>
                    Edite as configurações de SEO para melhorar a visibilidade nos mecanismos de busca
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={scanForMissingPages}
                  disabled={isScanning || isLoading}
                >
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Varrer Páginas
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-4">
                    {pages?.map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{page.page_name}</span>
                            <span className="text-sm text-muted-foreground">{page.page_route}</span>
                            <a 
                              href={page.page_route} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {page.title || <span className="italic">Título não definido</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(page)}
                          <Button variant="outline" size="sm" onClick={() => handleEdit(page)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog">
            <Card>
              <CardHeader>
                <CardTitle>Artigos do Blog</CardTitle>
                <CardDescription>
                  Otimize SEO dos artigos com título, descrição, palavras-chave e Open Graph
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBlog ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : blogPosts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum artigo encontrado</div>
                ) : (
                  <div className="space-y-2">
                    {blogPosts?.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate max-w-[300px]">{post.title}</span>
                            {!post.published && (
                              <Badge variant="outline" className="text-xs shrink-0">Rascunho</Badge>
                            )}
                            {post.keywords && (
                              <Badge variant="secondary" className="text-xs shrink-0">Keywords</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getBlogStatusBadge(post)}
                          <Button variant="outline" size="sm" onClick={() => handleEditBlog(post)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="isolated">
            <Card>
              <CardHeader>
                <CardTitle>Páginas Isoladas</CardTitle>
                <CardDescription>
                  Otimize SEO das páginas isoladas (Termos, Privacidade, Sobre, Landing Pages)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingIsolated ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : isolatedPages?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma página isolada encontrada</div>
                ) : (
                  <div className="space-y-2">
                    {isolatedPages?.map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate max-w-[300px]">{page.title}</span>
                            <span className="text-sm text-muted-foreground">/{page.slug}</span>
                            {!page.published && (
                              <Badge variant="outline" className="text-xs shrink-0">Rascunho</Badge>
                            )}
                            {page.keywords && (
                              <Badge variant="secondary" className="text-xs shrink-0">Keywords</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getBlogStatusBadge(page)}
                          <Button variant="outline" size="sm" onClick={() => handleEditBlog(page)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Artigos de Ajuda
                </CardTitle>
                <CardDescription>
                  Otimize SEO dos artigos da Central de Ajuda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHelp ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : helpArticles?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum artigo de ajuda encontrado</div>
                ) : (
                  <div className="space-y-2">
                    {helpArticles?.map((article) => {
                      const category = helpCategories?.find(c => c.id === article.category_id);
                      return (
                        <div
                          key={article.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate max-w-[300px]">{article.title}</span>
                              {category && (
                                <Badge variant="outline" className="text-xs shrink-0">{category.name}</Badge>
                              )}
                              {!article.is_published && (
                                <Badge variant="secondary" className="text-xs shrink-0 bg-yellow-500/20 text-yellow-600">Rascunho</Badge>
                              )}
                              {article.keywords && (
                                <Badge variant="secondary" className="text-xs shrink-0">Keywords</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getHelpStatusBadge(article)}
                            <Button variant="outline" size="sm" onClick={() => handleEditHelp(article)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Page Dialog */}
        <Dialog open={!!editingPage} onOpenChange={(open) => { if (!open) { setEditingPage(null); setAiSuggestions(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Editar SEO - {editingPage?.page_name}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetAISuggestions}
                  disabled={isLoadingAI}
                  className="ml-auto"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Sugestões com IA
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
              {/* Left Column - Form */}
              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">Título da Página (Title Tag)</Label>
                    {aiSuggestions?.improvedTitle && (
                      <Button variant="ghost" size="sm" onClick={applyImprovedTitle} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar sugestão
                      </Button>
                    )}
                  </div>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: WebQ - Sites Profissionais"
                    maxLength={70}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${(formData.title?.length || 0) > 60 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {formData.title?.length || 0}/60 caracteres
                    </span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          (formData.title?.length || 0) >= 50 && (formData.title?.length || 0) <= 60 
                            ? 'bg-green-500' 
                            : (formData.title?.length || 0) > 60 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, ((formData.title?.length || 0) / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {aiSuggestions?.improvedTitle && (
                    <div className="p-2 bg-primary/5 border border-primary/20 rounded text-sm">
                      <span className="text-muted-foreground">Sugestão: </span>
                      <span className="text-foreground">{aiSuggestions.improvedTitle}</span>
                    </div>
                  )}
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="meta_description">Meta Description</Label>
                    {aiSuggestions?.improvedDescription && (
                      <Button variant="ghost" size="sm" onClick={applyImprovedDescription} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar sugestão
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description || ''}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Descrição que aparece nos resultados de busca..."
                    maxLength={170}
                    rows={3}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${(formData.meta_description?.length || 0) > 160 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {formData.meta_description?.length || 0}/160 caracteres
                    </span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          (formData.meta_description?.length || 0) >= 150 && (formData.meta_description?.length || 0) <= 160 
                            ? 'bg-green-500' 
                            : (formData.meta_description?.length || 0) > 160 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, ((formData.meta_description?.length || 0) / 160) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {aiSuggestions?.improvedDescription && (
                    <div className="p-2 bg-primary/5 border border-primary/20 rounded text-sm">
                      <span className="text-muted-foreground">Sugestão: </span>
                      <span className="text-foreground">{aiSuggestions.improvedDescription}</span>
                    </div>
                  )}
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords || ''}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="site profissional, criação de site, hospedagem"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe as palavras-chave com vírgulas para análise
                  </p>
                </div>

                <hr />

                <h4 className="font-medium text-sm">Open Graph (Redes Sociais)</h4>

                <div className="space-y-2">
                  <Label htmlFor="og_title" className="text-sm">OG Title</Label>
                  <Input
                    id="og_title"
                    value={formData.og_title || ''}
                    onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                    placeholder="Deixe vazio para usar o título principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og_description" className="text-sm">OG Description</Label>
                  <Textarea
                    id="og_description"
                    value={formData.og_description || ''}
                    onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                    placeholder="Deixe vazio para usar a meta description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og_image" className="text-sm">OG Image URL</Label>
                  <Input
                    id="og_image"
                    value={formData.og_image || ''}
                    onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">Recomendado: 1200x630px</p>
                </div>
              </div>

              {/* Right Column - Preview, Analysis & AI Suggestions */}
              <div className="space-y-5">
                {/* SERP Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview no Google</Label>
                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">webq.com.br</p>
                          <p className="text-xs text-muted-foreground">
                            https://webq.com.br{editingPage?.page_route}
                          </p>
                        </div>
                      </div>
                      <h3 className="text-xl text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer leading-tight">
                        {truncateTitle(formData.title || "Título da página")}
                      </h3>
                      <p className="text-sm text-[#4d5156] dark:text-zinc-400 leading-relaxed">
                        {truncateDescription(formData.meta_description || "Adicione uma meta description...")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEO Analysis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Análise de SEO</Label>
                    <span className={`text-2xl font-bold ${getScoreColor(seoAnalysis.score)}`}>
                      {seoAnalysis.score}%
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(seoAnalysis.score)}`}
                      style={{ width: `${seoAnalysis.score}%` }}
                    />
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {seoAnalysis.issues.map((issue, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-2 text-sm p-2 rounded ${
                          issue.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          issue.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          issue.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {issue.type === 'error' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                        {issue.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                        {issue.type === 'info' && <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Sugestões da IA
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {aiSuggestions.suggestions.map((suggestion, index) => (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
                        >
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{suggestion.suggestion}</p>
                              {suggestion.example && (
                                <p className="text-xs mt-1 text-muted-foreground italic">
                                  Ex: {suggestion.example}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingPage(null); setAiSuggestions(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Blog Edit Dialog */}
        <Dialog open={!!editingBlogPost} onOpenChange={(open) => { if (!open) { setEditingBlogPost(null); setAiSuggestions(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Editar SEO - Artigo
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetBlogAISuggestions}
                  disabled={isLoadingAI}
                  className="ml-auto"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Sugestões com IA
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
              {/* Left Column - Form */}
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blog_title">Título do Artigo</Label>
                    {aiSuggestions?.improvedTitle && (
                      <Button variant="ghost" size="sm" onClick={applyBlogImprovedTitle} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar
                      </Button>
                    )}
                  </div>
                  <Input
                    id="blog_title"
                    value={blogFormData.title}
                    onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
                    placeholder="Ex: Como criar um site profissional"
                    maxLength={70}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${blogFormData.title.length > 60 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {blogFormData.title.length}/60
                    </span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          blogFormData.title.length >= 50 && blogFormData.title.length <= 60 
                            ? 'bg-green-500' 
                            : blogFormData.title.length > 60 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (blogFormData.title.length / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blog_meta_description">Meta Description</Label>
                    {aiSuggestions?.improvedDescription && (
                      <Button variant="ghost" size="sm" onClick={applyBlogImprovedDescription} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="blog_meta_description"
                    value={blogFormData.meta_description}
                    onChange={(e) => setBlogFormData({ ...blogFormData, meta_description: e.target.value })}
                    placeholder="Descrição SEO específica (se vazio, usa o excerpt)"
                    maxLength={170}
                    rows={2}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${blogFormData.meta_description.length > 160 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {blogFormData.meta_description.length}/160
                    </span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          blogFormData.meta_description.length >= 150 && blogFormData.meta_description.length <= 160 
                            ? 'bg-green-500' 
                            : blogFormData.meta_description.length > 160 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (blogFormData.meta_description.length / 160) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label htmlFor="blog_keywords">Palavras-chave</Label>
                  <Input
                    id="blog_keywords"
                    value={blogFormData.keywords}
                    onChange={(e) => setBlogFormData({ ...blogFormData, keywords: e.target.value })}
                    placeholder="site, blog, seo, marketing"
                  />
                  <p className="text-xs text-muted-foreground">Separe com vírgulas</p>
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <Label htmlFor="blog_excerpt">Excerpt (Resumo)</Label>
                  <Textarea
                    id="blog_excerpt"
                    value={blogFormData.excerpt}
                    onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
                    placeholder="Resumo exibido na listagem do blog"
                    rows={2}
                  />
                </div>

                <hr />

                <h4 className="font-medium text-sm">Open Graph</h4>

                <div className="space-y-2">
                  <Label htmlFor="blog_og_title" className="text-sm">OG Title</Label>
                  <Input
                    id="blog_og_title"
                    value={blogFormData.og_title}
                    onChange={(e) => setBlogFormData({ ...blogFormData, og_title: e.target.value })}
                    placeholder="Deixe vazio para usar o título"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blog_og_description" className="text-sm">OG Description</Label>
                  <Input
                    id="blog_og_description"
                    value={blogFormData.og_description}
                    onChange={(e) => setBlogFormData({ ...blogFormData, og_description: e.target.value })}
                    placeholder="Deixe vazio para usar a meta description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blog_og_image" className="text-sm">OG Image URL</Label>
                  <Input
                    id="blog_og_image"
                    value={blogFormData.og_image}
                    onChange={(e) => setBlogFormData({ ...blogFormData, og_image: e.target.value })}
                    placeholder="Deixe vazio para usar a capa"
                  />
                </div>
              </div>

              {/* Right Column - Preview & Analysis */}
              <div className="space-y-4">
                {/* SERP Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview no Google</Label>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          webq.com.br › blog › {editingBlogPost?.slug}
                        </p>
                      </div>
                      <h3 className="text-lg text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer leading-tight">
                        {truncateTitle(blogFormData.title || "Título do artigo")}
                      </h3>
                      <p className="text-sm text-[#4d5156] dark:text-zinc-400 leading-relaxed">
                        {truncateDescription(blogFormData.meta_description || blogFormData.excerpt || "Adicione uma descrição...")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEO Analysis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Análise SEO</Label>
                    <span className={`text-xl font-bold ${getScoreColor(blogSeoAnalysis.score)}`}>
                      {blogSeoAnalysis.score}%
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(blogSeoAnalysis.score)}`}
                      style={{ width: `${blogSeoAnalysis.score}%` }}
                    />
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {blogSeoAnalysis.issues.map((issue, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                          issue.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          issue.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          issue.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {issue.type === 'error' && <XCircle className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'warning' && <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'success' && <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'info' && <Info className="w-3 h-3 shrink-0 mt-0.5" />}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Sugestões da IA
                    </Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {aiSuggestions.suggestions.slice(0, 3).map((suggestion, index) => (
                        <div 
                          key={index}
                          className={`p-2 rounded-lg border text-xs ${getPriorityColor(suggestion.priority)}`}
                        >
                          <p className="font-medium">{suggestion.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cover Image Preview */}
                {editingBlogPost?.cover_image && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Capa</Label>
                    <img 
                      src={editingBlogPost.cover_image} 
                      alt="Preview" 
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingBlogPost(null); setAiSuggestions(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBlog} disabled={updateBlogMutation.isPending}>
                {updateBlogMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scan Results Dialog */}
        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Resultado da Varredura
              </DialogTitle>
            </DialogHeader>
            
            {missingPages.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">Todas as páginas estão cadastradas!</p>
                <p className="text-sm text-muted-foreground">
                  Nenhuma página faltando no gerenciamento de SEO.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Foram encontradas {missingPages.length} página(s) sem configuração de SEO:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {missingPages.map((page) => (
                    <div 
                      key={page.key}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <p className="text-xs text-muted-foreground">{page.route}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScanDialog(false)}>
                Fechar
              </Button>
              {missingPages.length > 0 && (
                <Button 
                  onClick={() => createPagesMutation.mutate(missingPages)}
                  disabled={createPagesMutation.isPending}
                >
                  {createPagesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Todas
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Help Article Dialog */}
        <Dialog open={!!editingHelpArticle} onOpenChange={(open) => { if (!open) { setEditingHelpArticle(null); setAiSuggestions(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Editar SEO - {editingHelpArticle?.title}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetHelpAISuggestions}
                  disabled={isLoadingAI}
                  className="ml-auto"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Sugestões com IA
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
              {/* Left Column - Form */}
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="help_title">Título (Title Tag)</Label>
                    {aiSuggestions?.improvedTitle && (
                      <Button variant="ghost" size="sm" onClick={applyHelpImprovedTitle} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar
                      </Button>
                    )}
                  </div>
                  <Input
                    id="help_title"
                    value={helpFormData.title}
                    onChange={(e) => setHelpFormData({ ...helpFormData, title: e.target.value })}
                    placeholder="Ex: Como configurar e-mails"
                    maxLength={70}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${helpFormData.title.length > 60 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {helpFormData.title.length}/60
                    </span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          helpFormData.title.length >= 50 && helpFormData.title.length <= 60 
                            ? 'bg-green-500' 
                            : helpFormData.title.length > 60 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (helpFormData.title.length / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="help_meta_description">Meta Description</Label>
                    {aiSuggestions?.improvedDescription && (
                      <Button variant="ghost" size="sm" onClick={applyHelpImprovedDescription} className="h-6 text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Aplicar
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="help_meta_description"
                    value={helpFormData.meta_description}
                    onChange={(e) => setHelpFormData({ ...helpFormData, meta_description: e.target.value })}
                    placeholder="Descrição SEO específica (se vazio, usa o excerpt)"
                    maxLength={170}
                    rows={2}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${helpFormData.meta_description.length > 160 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {helpFormData.meta_description.length}/160
                    </span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          helpFormData.meta_description.length >= 150 && helpFormData.meta_description.length <= 160 
                            ? 'bg-green-500' 
                            : helpFormData.meta_description.length > 160 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (helpFormData.meta_description.length / 160) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label htmlFor="help_keywords">Palavras-chave</Label>
                  <Input
                    id="help_keywords"
                    value={helpFormData.keywords}
                    onChange={(e) => setHelpFormData({ ...helpFormData, keywords: e.target.value })}
                    placeholder="ajuda, tutorial, guia"
                  />
                  <p className="text-xs text-muted-foreground">Separe com vírgulas</p>
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <Label htmlFor="help_excerpt">Excerpt (Resumo)</Label>
                  <Textarea
                    id="help_excerpt"
                    value={helpFormData.excerpt}
                    onChange={(e) => setHelpFormData({ ...helpFormData, excerpt: e.target.value })}
                    placeholder="Resumo do artigo"
                    rows={2}
                  />
                </div>

                <hr />

                <h4 className="font-medium text-sm">Open Graph</h4>

                <div className="space-y-2">
                  <Label htmlFor="help_og_title" className="text-sm">OG Title</Label>
                  <Input
                    id="help_og_title"
                    value={helpFormData.og_title}
                    onChange={(e) => setHelpFormData({ ...helpFormData, og_title: e.target.value })}
                    placeholder="Deixe vazio para usar o título"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help_og_description" className="text-sm">OG Description</Label>
                  <Input
                    id="help_og_description"
                    value={helpFormData.og_description}
                    onChange={(e) => setHelpFormData({ ...helpFormData, og_description: e.target.value })}
                    placeholder="Deixe vazio para usar a meta description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help_og_image" className="text-sm">OG Image URL</Label>
                  <Input
                    id="help_og_image"
                    value={helpFormData.og_image}
                    onChange={(e) => setHelpFormData({ ...helpFormData, og_image: e.target.value })}
                    placeholder="URL da imagem para redes sociais"
                  />
                </div>
              </div>

              {/* Right Column - Preview & Analysis */}
              <div className="space-y-4">
                {/* SERP Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview no Google</Label>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <HelpCircle className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          webq.com.br › ajuda › {editingHelpArticle?.slug}
                        </p>
                      </div>
                      <h3 className="text-lg text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer leading-tight">
                        {truncateTitle(helpFormData.title || "Título do artigo")}
                      </h3>
                      <p className="text-sm text-[#4d5156] dark:text-zinc-400 leading-relaxed">
                        {truncateDescription(helpFormData.meta_description || helpFormData.excerpt || "Adicione uma descrição...")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEO Analysis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Análise SEO</Label>
                    <span className={`text-xl font-bold ${getScoreColor(helpSeoAnalysis.score)}`}>
                      {helpSeoAnalysis.score}%
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(helpSeoAnalysis.score)}`}
                      style={{ width: `${helpSeoAnalysis.score}%` }}
                    />
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {helpSeoAnalysis.issues.map((issue, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                          issue.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          issue.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          issue.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {issue.type === 'error' && <XCircle className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'warning' && <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'success' && <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />}
                        {issue.type === 'info' && <Info className="w-3 h-3 shrink-0 mt-0.5" />}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Sugestões da IA
                    </Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {aiSuggestions.suggestions.slice(0, 3).map((suggestion, index) => (
                        <div 
                          key={index}
                          className={`p-2 rounded-lg border text-xs ${getPriorityColor(suggestion.priority)}`}
                        >
                          <p className="font-medium">{suggestion.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingHelpArticle(null); setAiSuggestions(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveHelp} disabled={updateHelpMutation.isPending}>
                {updateHelpMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayoutWithSidebar>
  );
}
