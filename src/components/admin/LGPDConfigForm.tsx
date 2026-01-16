import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cookie, Shield, Eye, Save, Loader2, Info, ExternalLink, Trash2, BarChart3, Clock, Search, Database, HardDrive, FileCode, Copy, Plus, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { categoryConfig, CookieCategory, detectActiveCookies, categorizeCookie } from "@/hooks/useCookieConsent";
import { supabase } from "@/integrations/supabase/client";
import CookiePurgeDialog from "./CookiePurgeDialog";

interface LGPDConfig {
  enabled: boolean;
  bannerTitle: string;
  bannerDescription: string;
  privacyPolicyUrl: string;
  position: "bottom-left" | "bottom-center" | "bottom-right";
  showDetailedList: boolean;
}

interface LGPDConfigFormProps {
  settings?: Record<string, { value: any }>;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

const defaultConfig: LGPDConfig = {
  enabled: true,
  bannerTitle: "Sua privacidade importa",
  bannerDescription: "Usamos cookies para melhorar sua experiência. Você pode personalizar suas preferências ou aceitar todos os cookies.",
  privacyPolicyUrl: "/politica-privacidade",
  position: "bottom-center",
  showDetailedList: true,
};

// Cookie Scanner Dialog Component
function CookieScannerDialog({ 
  categoryLabels,
  onRefresh 
}: { 
  categoryLabels: Record<CookieCategory, { label: string; color: string }>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [detectedCookies, setDetectedCookies] = useState<{
    localStorage: Array<{ name: string; category: CookieCategory; isNew: boolean }>;
    sessionStorage: Array<{ name: string; category: CookieCategory; isNew: boolean }>;
    cookies: Array<{ name: string; category: CookieCategory; isNew: boolean }>;
  } | null>(null);

  // Fetch registered cookies from database
  const { data: registeredCookies, refetch: refetchCookies } = useQuery({
    queryKey: ['cookie-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cookie_definitions')
        .select('name, category')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const isNewCookie = (name: string): boolean => {
    if (!registeredCookies) return true;
    return !registeredCookies.some(c => {
      const pattern = c.name.replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(name);
    });
  };

  const handleScan = () => {
    setScanning(true);
    setAddedItems(new Set());
    setTimeout(() => {
      const detected = detectActiveCookies();
      
      setDetectedCookies({
        localStorage: detected.localStorage.map(name => ({
          name,
          category: categorizeCookie(name),
          isNew: isNewCookie(name),
        })),
        sessionStorage: detected.sessionStorage.map(name => ({
          name,
          category: categorizeCookie(name),
          isNew: isNewCookie(name),
        })),
        cookies: detected.cookies.map(name => ({
          name,
          category: categorizeCookie(name),
          isNew: isNewCookie(name),
        })),
      });
      setScanning(false);
    }, 500);
  };

  const getPurposeForCategory = (category: CookieCategory): string => {
    const purposeMap: Record<CookieCategory, string> = {
      essential: "Funcionalidade essencial do sistema",
      preferences: "Armazenar preferências do usuário",
      analytics: "Análise e métricas de uso",
      marketing: "Marketing e publicidade",
    };
    return purposeMap[category];
  };

  const handleAddCookie = async (name: string, category: CookieCategory) => {
    setAdding(name);
    try {
      const { error } = await supabase
        .from('cookie_definitions')
        .insert({
          name,
          category,
          purpose: getPurposeForCategory(category),
          duration: 'Sessão',
        });
      
      if (error) {
        if (error.code === '23505') {
          toast.error("Cookie já registrado");
        } else {
          throw error;
        }
      } else {
        setAddedItems(prev => new Set([...prev, name]));
        toast.success("Cookie adicionado!", {
          description: `${name} foi registrado como ${categoryLabels[category].label}`,
        });
        refetchCookies();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar cookie");
    } finally {
      setAdding(null);
    }
  };

  const handleAddAllNew = async () => {
    if (!detectedCookies) return;
    
    const allNew = [
      ...detectedCookies.localStorage.filter(c => c.isNew && !addedItems.has(c.name)),
      ...detectedCookies.sessionStorage.filter(c => c.isNew && !addedItems.has(c.name)),
      ...detectedCookies.cookies.filter(c => c.isNew && !addedItems.has(c.name)),
    ];
    
    if (allNew.length === 0) {
      toast.info("Nenhum cookie novo para adicionar");
      return;
    }
    
    setAdding('all');
    try {
      const cookiesToInsert = allNew.map(c => ({
        name: c.name,
        category: c.category,
        purpose: getPurposeForCategory(c.category),
        duration: 'Sessão',
      }));
      
      const { error } = await supabase
        .from('cookie_definitions')
        .insert(cookiesToInsert);
      
      if (error) throw error;
      
      setAddedItems(prev => new Set([...prev, ...allNew.map(c => c.name)]));
      toast.success(`${allNew.length} cookie(s) adicionado(s)!`);
      refetchCookies();
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar cookies");
    } finally {
      setAdding(null);
    }
  };

  const totalDetected = detectedCookies 
    ? detectedCookies.localStorage.length + detectedCookies.sessionStorage.length + detectedCookies.cookies.length
    : 0;

  const newCookiesCount = detectedCookies
    ? [...detectedCookies.localStorage, ...detectedCookies.sessionStorage, ...detectedCookies.cookies]
        .filter(c => c.isNew && !addedItems.has(c.name)).length
    : 0;

  const renderCookieItem = (item: { name: string; category: CookieCategory; isNew: boolean }, idx: number) => {
    const isAdded = addedItems.has(item.name);
    const isAdding = adding === item.name;
    
    return (
      <div key={idx} className="p-2 flex items-center justify-between text-sm gap-2">
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[180px]">
          {item.name}
        </code>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className={categoryLabels[item.category].color}>
            {categoryLabels[item.category].label}
          </Badge>
          {item.isNew && !isAdded && (
            <>
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                Novo
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleAddCookie(item.name, item.category)}
                disabled={isAdding}
                title="Adicionar ao registro"
              >
                {isAdding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </>
          )}
          {isAdded && (
            <Badge variant="outline" className="text-green-600 border-green-500">
              <Check className="h-3 w-3 mr-1" />
              Adicionado
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Detectar Cookies Ativos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Scanner de Cookies
          </DialogTitle>
          <DialogDescription>
            Detecta cookies e dados armazenados atualmente no navegador para verificar conformidade LGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!detectedCookies ? (
            <div className="text-center py-8">
              <Cookie className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                Clique no botão abaixo para escanear cookies e armazenamento local do navegador.
              </p>
              <Button onClick={handleScan} disabled={scanning} className="gap-2">
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Escaneando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Iniciar Scan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{totalDetected}</p>
                  <p className="text-xs text-muted-foreground">Total Detectado</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <p className="text-2xl font-bold text-green-600">{totalDetected - newCookiesCount}</p>
                  <p className="text-xs text-muted-foreground">Já Registrados</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 text-center">
                  <p className="text-2xl font-bold text-amber-600">{newCookiesCount}</p>
                  <p className="text-xs text-muted-foreground">Não Registrados</p>
                </div>
              </div>

              {/* Cookies */}
              {detectedCookies.cookies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Cookie className="h-4 w-4" />
                    Cookies do Navegador ({detectedCookies.cookies.length})
                  </h4>
                  <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                    {detectedCookies.cookies.map((cookie, idx) => renderCookieItem(cookie, idx))}
                  </div>
                </div>
              )}

              {/* LocalStorage */}
              {detectedCookies.localStorage.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4" />
                    LocalStorage ({detectedCookies.localStorage.length})
                  </h4>
                  <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                    {detectedCookies.localStorage.map((item, idx) => renderCookieItem(item, idx))}
                  </div>
                </div>
              )}

              {/* SessionStorage */}
              {detectedCookies.sessionStorage.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" />
                    SessionStorage ({detectedCookies.sessionStorage.length})
                  </h4>
                  <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                    {detectedCookies.sessionStorage.map((item, idx) => renderCookieItem(item, idx))}
                  </div>
                </div>
              )}

              {/* Info about new cookies with add all button */}
              {newCookiesCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>{newCookiesCount} cookie(s)</strong> detectado(s) que não estão na lista de cookies registrados.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={handleAddAllNew}
                    disabled={adding === 'all'}
                  >
                    {adding === 'all' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Adicionar Todos os Novos ({newCookiesCount})
                  </Button>
                </div>
              )}

              {/* Rescan button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleScan} disabled={scanning} className="gap-2">
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Escanear Novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Cookie Definitions Table with Edit/Delete
interface CookieDefinition {
  id: string;
  name: string;
  category: string;
  purpose: string;
  duration: string;
}

function CookieDefinitionsTable({ 
  cookies, 
  loading, 
  categoryLabels,
  onRefresh 
}: { 
  cookies: CookieDefinition[];
  loading: boolean;
  categoryLabels: Record<CookieCategory, { label: string; color: string }>;
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CookieDefinition>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleEdit = (cookie: CookieDefinition) => {
    setEditingId(cookie.id);
    setEditForm({
      category: cookie.category,
      purpose: cookie.purpose,
      duration: cookie.duration,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cookie_definitions')
        .update({
          category: editForm.category,
          purpose: editForm.purpose,
          duration: editForm.duration,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Cookie atualizado!");
      setEditingId(null);
      setEditForm({});
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar cookie");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" da lista de cookies?`)) return;
    
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('cookie_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Cookie removido!");
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover cookie");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando cookies...
        </div>
      </div>
    );
  }

  if (!cookies || cookies.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-muted-foreground">
        Nenhum cookie registrado
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-3 font-medium">Cookie</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Finalidade</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Duração</th>
              <th className="text-right p-3 font-medium w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cookies.map((cookie) => {
              const isEditing = editingId === cookie.id;
              
              return (
                <tr key={cookie.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {cookie.name}
                    </code>
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <Select 
                        value={editForm.category} 
                        onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="essential">Necessários</SelectItem>
                          <SelectItem value="preferences">Preferências</SelectItem>
                          <SelectItem value="analytics">Análise</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className={categoryLabels[cookie.category as CookieCategory]?.color || ''}
                      >
                        {categoryLabels[cookie.category as CookieCategory]?.label || cookie.category}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {isEditing ? (
                      <Input
                        value={editForm.purpose || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
                        className="h-8 text-xs"
                        placeholder="Finalidade do cookie"
                      />
                    ) : (
                      <span className="text-muted-foreground">{cookie.purpose}</span>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {isEditing ? (
                      <Input
                        value={editForm.duration || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="h-8 text-xs w-24"
                        placeholder="Duração"
                      />
                    ) : (
                      <span className="text-muted-foreground">{cookie.duration}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit(cookie.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(cookie)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cookie.id, cookie.name)}
                            disabled={deleting === cookie.id}
                            title="Remover"
                          >
                            {deleting === cookie.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
        {cookies.length} cookie(s) registrado(s)
      </div>
    </div>
  );
}

export default function LGPDConfigForm({ settings, onSave, isSaving }: LGPDConfigFormProps) {
  const [config, setConfig] = useState<LGPDConfig>(defaultConfig);

  // Fetch cookie definitions from database
  const { data: cookieDefinitions, isLoading: loadingCookies, refetch: refetchCookies } = useQuery({
    queryKey: ['cookie-definitions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cookie_definitions')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch page analytics from cookie_consent_logs
  const { data: pageAnalytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['cookie-page-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cookie_consent_logs')
        .select('page_url, time_on_site_seconds')
        .not('page_url', 'is', null);
      
      if (error) throw error;
      
      // Group by page_url and calculate stats
      const pageStats = new Map<string, { visits: number; totalTime: number }>();
      
      (data || []).forEach((row) => {
        const url = row.page_url as string;
        const time = row.time_on_site_seconds || 0;
        
        if (pageStats.has(url)) {
          const stats = pageStats.get(url)!;
          stats.visits++;
          stats.totalTime += time;
        } else {
          pageStats.set(url, { visits: 1, totalTime: time });
        }
      });
      
      // Convert to array and sort by visits
      const result = Array.from(pageStats.entries())
        .map(([url, stats]) => ({
          page_url: url,
          visits: stats.visits,
          avg_time: stats.visits > 0 ? Math.round(stats.totalTime / stats.visits) : 0
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
      
      return result;
    },
  });

  useEffect(() => {
    if (settings?.lgpd_config?.value) {
      setConfig({ ...defaultConfig, ...settings.lgpd_config.value });
    }
  }, [settings]);

  const handleSave = () => {
    onSave("lgpd_config", config);
  };

  const updateConfig = (key: keyof LGPDConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const categoryLabels: Record<CookieCategory, { label: string; color: string }> = {
    essential: { label: "Necessários", color: "bg-green-500/20 text-green-600" },
    preferences: { label: "Preferências", color: "bg-blue-500/20 text-blue-600" },
    analytics: { label: "Análise e Desempenho", color: "bg-purple-500/20 text-purple-600" },
    marketing: { label: "Marketing", color: "bg-orange-500/20 text-orange-600" },
  };

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Configurações do Banner LGPD</CardTitle>
              <CardDescription>
                Configure o banner de consentimento de cookies exibido aos visitantes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">Ativar Banner de Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, exibe o banner de consentimento para novos visitantes.
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig("enabled", checked)}
            />
          </div>

          <Separator />

          {/* Content Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Cookie className="h-4 w-4 text-muted-foreground" />
              Conteúdo do Banner
            </h4>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="bannerTitle">Título</Label>
                <Input
                  id="bannerTitle"
                  value={config.bannerTitle}
                  onChange={(e) => updateConfig("bannerTitle", e.target.value)}
                  placeholder="Sua privacidade importa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerDescription">Descrição</Label>
                <Textarea
                  id="bannerDescription"
                  value={config.bannerDescription}
                  onChange={(e) => updateConfig("bannerDescription", e.target.value)}
                  placeholder="Usamos cookies para melhorar sua experiência..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacyPolicyUrl">URL da Política de Privacidade</Label>
                <Input
                  id="privacyPolicyUrl"
                  value={config.privacyPolicyUrl}
                  onChange={(e) => updateConfig("privacyPolicyUrl", e.target.value)}
                  placeholder="/politica-privacidade"
                />
                <p className="text-xs text-muted-foreground">
                  Link exibido no banner para a página de política de privacidade.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Display Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Exibição
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Posição do Banner</Label>
                <Select
                  value={config.position}
                  onValueChange={(value: LGPDConfig["position"]) => updateConfig("position", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                    <SelectItem value="bottom-center">Inferior Centro</SelectItem>
                    <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="font-medium">Lista Detalhada</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar lista de cookies no modal
                  </p>
                </div>
                <Switch
                  checked={config.showDetailedList}
                  onCheckedChange={(checked) => updateConfig("showDetailedList", checked)}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie List Reference Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Cookies Registrados</CardTitle>
                <CardDescription>
                  Lista de cookies utilizados pelo sistema, exibida aos usuários no banner.
                </CardDescription>
              </div>
            </div>
            <CookieScannerDialog categoryLabels={categoryLabels} onRefresh={refetchCookies} />
          </div>
        </CardHeader>
        <CardContent>
          <CookieDefinitionsTable 
            cookies={cookieDefinitions || []}
            loading={loadingCookies}
            categoryLabels={categoryLabels}
            onRefresh={refetchCookies}
          />

          <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Sobre a conformidade LGPD
                </p>
                <p className="text-sm text-blue-600/80 dark:text-blue-300/80">
                  O sistema bloqueia automaticamente o armazenamento de cookies não-essenciais 
                  até que o usuário dê consentimento. Cookies essenciais são sempre permitidos 
                  pois são necessários para o funcionamento básico do site.
                </p>
                <a 
                  href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                >
                  Ler Lei 13.709/2018 (LGPD)
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Analytics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Páginas Mais Visitadas</CardTitle>
              <CardDescription>
                Top 10 páginas com mais registros de consentimento e tempo médio de permanência.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAnalytics ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pageAnalytics && pageAnalytics.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Página</th>
                    <th className="text-right p-3 font-medium">Visitas</th>
                    <th className="text-right p-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Tempo Médio
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageAnalytics.map((page, index) => (
                    <tr key={page.page_url} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground font-medium">
                        {index + 1}
                      </td>
                      <td className="p-3">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">
                          {page.page_url}
                        </code>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {page.visits.toLocaleString('pt-BR')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {formatTime(page.avg_time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum dado de página disponível ainda.</p>
              <p className="text-sm">Os dados aparecerão após os visitantes interagirem com o banner de cookies.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Cookie Purge */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam os dados de auditoria LGPD.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Limpar Registros de Consentimento</p>
                <p className="text-sm text-muted-foreground">
                  Exclui permanentemente todos os registros de consentimento de cookies do banco de dados.
                  Esta ação requer verificação por e-mail.
                </p>
              </div>
              <CookiePurgeDialog />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
