import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Save, Trash2, Package, FolderOpen, GripVertical, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface DesignPackage {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  includes: string[];
  estimated_days: number;
  display_order: number;
  is_active: boolean;
  is_bundle: boolean;
}

export default function DesignPackagesConfigForm() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("packages");

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['design-categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_service_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch packages
  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['design-packages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_packages')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as DesignPackage[];
    },
  });

  // Update package mutation
  const updatePackageMutation = useMutation({
    mutationFn: async (pkg: DesignPackage) => {
      const { error } = await supabase
        .from('design_packages')
        .update({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          stripe_product_id: pkg.stripe_product_id,
          stripe_price_id: pkg.stripe_price_id,
          includes: pkg.includes,
          estimated_days: pkg.estimated_days,
          is_active: pkg.is_active,
          is_bundle: pkg.is_bundle,
          category_id: pkg.category_id,
        })
        .eq('id', pkg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-packages-admin'] });
      toast.success('Pacote atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (cat: Category) => {
      const { error } = await supabase
        .from('design_service_categories')
        .update({
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          is_active: cat.is_active,
        })
        .eq('id', cat.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-categories-admin'] });
      toast.success('Categoria atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Create Stripe IDs mutation
  const createStripeMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const { data, error } = await supabase.functions.invoke('create-design-package-stripe', {
        body: { package_id: packageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['design-packages-admin'] });
      toast.success(`Stripe IDs criados: ${data.stripe_product_id?.slice(0, 15)}...`);
    },
    onError: (error) => {
      toast.error('Erro ao criar Stripe IDs: ' + error.message);
    },
  });

  if (loadingCategories || loadingPackages) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group packages by category
  const packagesByCategory = categories.map(cat => ({
    category: cat,
    packages: packages.filter(pkg => pkg.category_id === cat.id),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Pacotes de Design
          </CardTitle>
          <CardDescription>
            Configure categorias, pacotes, preços e integrações com Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="packages">Pacotes</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
            </TabsList>

            <TabsContent value="packages" className="space-y-6 mt-6">
              {packagesByCategory.map(({ category, packages: catPackages }) => (
                <Accordion key={category.id} type="single" collapsible className="border rounded-lg">
                  <AccordionItem value={category.id} className="border-0">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant="secondary">{catPackages.length} pacotes</Badge>
                        {!category.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {catPackages.map((pkg) => (
                          <PackageCard
                            key={pkg.id}
                            pkg={pkg}
                            categories={categories}
                            onSave={(updatedPkg) => updatePackageMutation.mutate(updatedPkg)}
                            isSaving={updatePackageMutation.isPending}
                            onCreateStripe={(pkgId) => createStripeMutation.mutate(pkgId)}
                            isCreatingStripe={createStripeMutation.isPending}
                          />
                        ))}
                        {catPackages.length === 0 && (
                          <p className="text-muted-foreground text-sm py-4 text-center">
                            Nenhum pacote nesta categoria
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 mt-6">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onSave={(updatedCat) => updateCategoryMutation.mutate(updatedCat)}
                  isSaving={updateCategoryMutation.isPending}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function PackageCard({
  pkg,
  categories,
  onSave,
  isSaving,
  onCreateStripe,
  isCreatingStripe,
}: {
  pkg: DesignPackage;
  categories: Category[];
  onSave: (pkg: DesignPackage) => void;
  isSaving: boolean;
  onCreateStripe: (packageId: string) => void;
  isCreatingStripe: boolean;
}) {
  const [editedPkg, setEditedPkg] = useState(pkg);
  const [includesText, setIncludesText] = useState(pkg.includes?.join('\n') || '');

  const handleSave = () => {
    onSave({
      ...editedPkg,
      includes: includesText.split('\n').filter(line => line.trim()),
    });
  };

  const hasChanges = JSON.stringify(editedPkg) !== JSON.stringify(pkg) || 
    includesText !== (pkg.includes?.join('\n') || '');

  const needsStripeIds = !editedPkg.stripe_product_id || !editedPkg.stripe_price_id;

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Nome do Pacote</Label>
                <Input
                  value={editedPkg.name}
                  onChange={(e) => setEditedPkg({ ...editedPkg, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={editedPkg.price}
                  onChange={(e) => setEditedPkg({ ...editedPkg, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={editedPkg.description || ''}
                onChange={(e) => setEditedPkg({ ...editedPkg, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={editedPkg.category_id}
                  onValueChange={(value) => setEditedPkg({ ...editedPkg, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo Estimado (dias)</Label>
                <Input
                  type="number"
                  value={editedPkg.estimated_days}
                  onChange={(e) => setEditedPkg({ ...editedPkg, estimated_days: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editedPkg.is_active}
                    onCheckedChange={(checked) => setEditedPkg({ ...editedPkg, is_active: checked })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editedPkg.is_bundle}
                    onCheckedChange={(checked) => setEditedPkg({ ...editedPkg, is_bundle: checked })}
                  />
                  <Label>Kit/Combo</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>O que inclui (um item por linha)</Label>
              <Textarea
                value={includesText}
                onChange={(e) => setIncludesText(e.target.value)}
                rows={3}
                placeholder="Digite um item por linha..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Stripe Product ID</Label>
                <Input
                  value={editedPkg.stripe_product_id || ''}
                  onChange={(e) => setEditedPkg({ ...editedPkg, stripe_product_id: e.target.value })}
                  placeholder="prod_..."
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Stripe Price ID</Label>
                <Input
                  value={editedPkg.stripe_price_id || ''}
                  onChange={(e) => setEditedPkg({ ...editedPkg, stripe_price_id: e.target.value })}
                  placeholder="price_..."
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {needsStripeIds && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Zap className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Stripe IDs não configurados</p>
                  <p className="text-xs text-muted-foreground">Clique para criar automaticamente no Stripe</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateStripe(pkg.id)}
                  disabled={isCreatingStripe || hasChanges}
                  className="border-amber-500/50 hover:bg-amber-500/10"
                >
                  {isCreatingStripe ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Criar IDs
                </Button>
              </div>
            )}
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryCard({
  category,
  onSave,
  isSaving,
}: {
  category: Category;
  onSave: (cat: Category) => void;
  isSaving: boolean;
}) {
  const [editedCat, setEditedCat] = useState(category);

  const hasChanges = JSON.stringify(editedCat) !== JSON.stringify(category);

  const iconOptions = ['Share2', 'FileText', 'TrendingUp', 'Presentation', 'Palette', 'Image', 'Layout'];

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Nome da Categoria</Label>
            <Input
              value={editedCat.name}
              onChange={(e) => setEditedCat({ ...editedCat, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Ícone</Label>
            <Select
              value={editedCat.icon}
              onValueChange={(value) => setEditedCat({ ...editedCat, icon: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((icon) => (
                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={editedCat.is_active}
              onCheckedChange={(checked) => setEditedCat({ ...editedCat, is_active: checked })}
            />
            <Label>Ativo</Label>
          </div>
        </div>

        <div>
          <Label>Descrição</Label>
          <Input
            value={editedCat.description || ''}
            onChange={(e) => setEditedCat({ ...editedCat, description: e.target.value })}
          />
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={() => onSave(editedCat)} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
