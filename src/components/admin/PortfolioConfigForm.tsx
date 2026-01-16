import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Trash2, GripVertical, Upload, ExternalLink, Save, ArrowUp, ArrowDown } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PortfolioItem {
  id: string;
  title: string;
  image_url: string;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface ColumnConfig {
  speed: number; // seconds for full cycle
  direction: 'up' | 'down';
  offsetY: number; // pixels offset
}

interface ShowcaseConfig {
  showTitles: boolean;
  showBorders: boolean;
  columnGap: number;
  imageGap: number;
  columns: ColumnConfig[];
}

const defaultShowcaseConfig: ShowcaseConfig = {
  showTitles: true,
  showBorders: true,
  columnGap: 18,
  imageGap: 32,
  columns: [
    { speed: 20, direction: 'up', offsetY: -40 },
    { speed: 25, direction: 'down', offsetY: 60 },
    { speed: 22, direction: 'up', offsetY: -20 },
    { speed: 28, direction: 'down', offsetY: 80 },
  ],
};

function SortableItem({ item, onDelete, onToggleActive, onUpdate }: { 
  item: PortfolioItem; 
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onUpdate: (id: string, field: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
      <button {...attributes} {...listeners} className="mt-2 cursor-grab hover:text-primary">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="w-24 h-16 rounded overflow-hidden border border-border shrink-0">
        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-1 space-y-2">
        <Input
          value={item.title}
          onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
          placeholder="Nome do projeto"
          className="h-8"
        />
        <Input
          value={item.website_url || ''}
          onChange={(e) => onUpdate(item.id, 'website_url', e.target.value)}
          placeholder="URL do site (opcional)"
          className="h-8"
        />
      </div>
      
      <div className="flex items-center gap-3">
        {item.website_url && (
          <a href={item.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${item.id}`} className="text-xs text-muted-foreground">Ativo</Label>
          <Switch
            id={`active-${item.id}`}
            checked={item.is_active}
            onCheckedChange={(checked) => onToggleActive(item.id, checked)}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PortfolioConfigForm() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [showcaseConfig, setShowcaseConfig] = useState<ShowcaseConfig>(defaultShowcaseConfig);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portfolio-items-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  const { data: savedConfig } = useQuery({
    queryKey: ['portfolio-showcase-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'portfolio_showcase_config')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value as unknown as ShowcaseConfig | null;
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setShowcaseConfig(savedConfig);
    }
  }, [savedConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (config: ShowcaseConfig) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'portfolio_showcase_config',
          value: config as any,
          description: 'Configurações de exibição do showcase de portfólio',
        }, { onConflict: 'key' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-showcase-config'] });
      setHasChanges(false);
      toast.success('Configurações salvas!');
    },
    onError: (error) => toast.error('Erro ao salvar: ' + error.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portfolio-screenshots')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-screenshots')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('portfolio_items')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          image_url: publicUrl,
          display_order: items.length,
          is_active: true,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-public'] });
      toast.success('Imagem adicionada!');
    },
    onError: (error) => toast.error('Erro ao fazer upload: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PortfolioItem> }) => {
      const { error } = await supabase
        .from('portfolio_items')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-public'] });
    },
    onError: (error) => toast.error('Erro ao atualizar: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = items.find(i => i.id === id);
      if (item) {
        const fileName = item.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('portfolio-screenshots').remove([fileName]);
        }
      }
      
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-public'] });
      toast.success('Item removido!');
    },
    onError: (error) => toast.error('Erro ao remover: ' + error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (newOrder: PortfolioItem[]) => {
      const updates = newOrder.map((item, index) => 
        supabase.from('portfolio_items').update({ display_order: index }).eq('id', item.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-items-public'] });
    },
    onError: (error) => toast.error('Erro ao reordenar: ' + error.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsUploading(true);
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const newOrder = arrayMove(items, oldIndex, newIndex);
    
    queryClient.setQueryData(['portfolio-items-admin'], newOrder);
    reorderMutation.mutate(newOrder);
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    updateMutation.mutate({ id, updates: { [field]: value || null } });
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateMutation.mutate({ id, updates: { is_active: active } });
  };

  const updateColumnConfig = (index: number, field: keyof ColumnConfig, value: any) => {
    const newConfig = { ...showcaseConfig };
    newConfig.columns = [...showcaseConfig.columns];
    newConfig.columns[index] = { ...newConfig.columns[index], [field]: value };
    setShowcaseConfig(newConfig);
    setHasChanges(true);
  };

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(showcaseConfig);
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
      {/* Showcase Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Exibição</CardTitle>
          <CardDescription>
            Controle como o showcase aparece na página inicial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar nomes dos projetos</Label>
                <p className="text-xs text-muted-foreground">Exibe o título abaixo de cada imagem</p>
              </div>
              <Switch
                checked={showcaseConfig.showTitles}
                onCheckedChange={(checked) => {
                  setShowcaseConfig({ ...showcaseConfig, showTitles: checked });
                  setHasChanges(true);
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar bordas nas imagens</Label>
                <p className="text-xs text-muted-foreground">Adiciona bordas visíveis ao redor das imagens</p>
              </div>
              <Switch
                checked={showcaseConfig.showBorders}
                onCheckedChange={(checked) => {
                  setShowcaseConfig({ ...showcaseConfig, showBorders: checked });
                  setHasChanges(true);
                }}
              />
            </div>

            {/* Gap Settings */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Espaço entre colunas</Label>
                <span className="text-sm text-muted-foreground">{showcaseConfig.columnGap || 18}px</span>
              </div>
              <Slider
                value={[showcaseConfig.columnGap || 18]}
                onValueChange={(value) => {
                  setShowcaseConfig({ ...showcaseConfig, columnGap: value[0] });
                  setHasChanges(true);
                }}
                min={8}
                max={40}
                step={2}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Espaço entre imagens</Label>
                <span className="text-sm text-muted-foreground">{showcaseConfig.imageGap || 32}px</span>
              </div>
              <Slider
                value={[showcaseConfig.imageGap || 32]}
                onValueChange={(value) => {
                  setShowcaseConfig({ ...showcaseConfig, imageGap: value[0] });
                  setHasChanges(true);
                }}
                min={8}
                max={60}
                step={2}
                className="w-full"
              />
            </div>
          </div>

          {/* Column Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Configurações por Coluna</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showcaseConfig.columns.map((col, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Coluna {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {col.direction === 'up' ? (
                        <ArrowUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Direction */}
                  <div className="space-y-2">
                    <Label className="text-xs">Direção</Label>
                    <Select
                      value={col.direction}
                      onValueChange={(value: 'up' | 'down') => updateColumnConfig(index, 'direction', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="up">↑ Para cima</SelectItem>
                        <SelectItem value="down">↓ Para baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Speed */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Velocidade</Label>
                      <span className="text-xs text-muted-foreground">{col.speed}s</span>
                    </div>
                  <Slider
                      value={[col.speed]}
                      onValueChange={(value) => updateColumnConfig(index, 'speed', value[0])}
                      min={10}
                      max={120}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Maior = mais lento (10-120s)</p>
                  </div>

                  {/* Offset */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Offset Vertical</Label>
                      <span className="text-xs text-muted-foreground">{col.offsetY}px</span>
                    </div>
                    <Slider
                      value={[col.offsetY]}
                      onValueChange={(value) => updateColumnConfig(index, 'offsetY', value[0])}
                      min={-100}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Negativo = mais acima</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveConfig} 
              disabled={!hasChanges || saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Portfólio</CardTitle>
          <CardDescription>
            Gerencie as imagens que aparecem no showcase. Arraste para reordenar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="portfolio-upload"
              disabled={isUploading}
            />
            <label htmlFor="portfolio-upload" className="cursor-pointer">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Enviando...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique ou arraste imagens para adicionar
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recomendado: 1200x800px ou superior
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* Items List */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item no portfólio ainda.</p>
              <p className="text-sm">Adicione screenshots dos sites que você desenvolveu.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onToggleActive={handleToggleActive}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
