import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Rocket, Mail, Globe, CreditCard, Shield, HelpCircle, BookOpen, Settings, Users, FileText } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { logAction } from "@/services/auditService";

const ICON_OPTIONS = [
  { value: "Rocket", label: "Foguete", icon: Rocket },
  { value: "Mail", label: "Email", icon: Mail },
  { value: "Globe", label: "Domínio", icon: Globe },
  { value: "CreditCard", label: "Pagamento", icon: CreditCard },
  { value: "Shield", label: "Segurança", icon: Shield },
  { value: "HelpCircle", label: "Ajuda", icon: HelpCircle },
  { value: "BookOpen", label: "Tutorial", icon: BookOpen },
  { value: "Settings", label: "Configurações", icon: Settings },
  { value: "Users", label: "Usuários", icon: Users },
  { value: "FileText", label: "Documentos", icon: FileText },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_active: boolean;
}

function SortableCategory({ category, onEdit, onDelete }: { category: Category; onEdit: (c: Category) => void; onDelete: (data: { id: string; name: string }) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = ICON_OPTIONS.find((i) => i.value === category.icon)?.icon || HelpCircle;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <IconComponent className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <p className="text-sm text-muted-foreground truncate">/ajuda/{category.slug}</p>
      </div>
      <div className="flex items-center gap-2">
        {!category.is_active && (
          <span className="text-xs bg-muted px-2 py-1 rounded">Inativo</span>
        )}
        <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete({ id: category.id, name: category.name })}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function HelpCategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    icon: "HelpCircle",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["help-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("help_categories")
          .update({
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            icon: data.icon,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await supabase.from("help_categories").insert({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          icon: data.icon,
          is_active: data.is_active,
          display_order: maxOrder + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["help-categories-admin"] });
      setIsDialogOpen(false);
      const isEdit = !!editingCategory;
      logAction({
        actionType: isEdit ? 'update' : 'create',
        entityType: 'help_category',
        entityId: variables.id,
        entityName: variables.name,
        description: isEdit ? `Categoria "${variables.name}" atualizada` : `Categoria "${variables.name}" criada`,
      });
      setEditingCategory(null);
      resetForm();
      toast({ title: isEdit ? "Categoria atualizada" : "Categoria criada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("help_categories").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["help-categories-admin"] });
      logAction({
        actionType: 'delete',
        entityType: 'help_category',
        entityId: variables.id,
        entityName: variables.name,
        description: `Categoria "${variables.name}" excluída`,
      });
      toast({ title: "Categoria excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({ id, display_order: index }));
      for (const update of updates) {
        const { error } = await supabase
          .from("help_categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories-admin"] });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", icon: "HelpCircle", is_active: true });
  };

  const openNew = () => {
    resetForm();
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "HelpCircle",
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map((c) => c.id));
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : generateSlug(name),
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ ...formData, id: editingCategory?.id });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
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
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData((prev) => ({ ...prev, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
                />
                <Label>Categoria ativa</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma categoria criada</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    onEdit={openEdit}
                    onDelete={(data) => deleteMutation.mutate(data)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
