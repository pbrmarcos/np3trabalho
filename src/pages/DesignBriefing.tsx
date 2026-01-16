import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import {
  CheckCircle, 
  Upload, 
  Palette, 
  Globe, 
  MessageSquare,
  Loader2,
  AlertCircle
} from "lucide-react";

interface DesignOrder {
  id: string;
  package_id: string;
  status: string;
  payment_status: string;
  has_brand_identity: boolean;
  briefing_data: Record<string, any> | null;
  notes: string | null;
  brand_files: string[];
  reference_files: string[];
  preferred_color: string | null;
  logo_description: string | null;
  inspiration_urls: string[] | null;
  design_packages: {
    id: string;
    name: string;
    category_id: string;
    design_service_categories: {
      id: string;
      name: string;
    };
  };
}

export default function DesignBriefing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const orderId = searchParams.get("order");

  // Form state
  const [notes, setNotes] = useState("");
  const [preferredColor, setPreferredColor] = useState("");
  const [logoDescription, setLogoDescription] = useState("");
  const [inspirationUrls, setInspirationUrls] = useState("");
  const [brandFiles, setBrandFiles] = useState<string[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["design-order-briefing", orderId],
    queryFn: async () => {
      if (!orderId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("design_orders")
        .select(`
          id,
          package_id,
          status,
          payment_status,
          has_brand_identity,
          briefing_data,
          notes,
          brand_files,
          reference_files,
          preferred_color,
          logo_description,
          inspiration_urls,
          design_packages(
            id,
            name,
            category_id,
            design_service_categories(id, name)
          )
        `)
        .eq("id", orderId)
        .eq("client_id", user.id)
        .single();
      
      if (error) throw error;
      
      // Cast the result to handle the nested join properly
      const orderData = data as unknown as DesignOrder;
      return orderData;
    },
    enabled: !!orderId && !!user?.id,
  });

  // Initialize form with existing data
  useState(() => {
    if (order) {
      setNotes(order.notes || "");
      setPreferredColor(order.preferred_color || "");
      setLogoDescription(order.logo_description || "");
      setInspirationUrls(order.inspiration_urls?.join("\n") || "");
      setBrandFiles(order.brand_files || []);
      setReferenceFiles(order.reference_files || []);
    }
  });

  // Submit briefing mutation
  const submitBriefing = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Order ID not found");

      const updateData = {
        notes,
        preferred_color: preferredColor || null,
        logo_description: logoDescription || null,
        inspiration_urls: inspirationUrls.split("\n").filter(url => url.trim()),
        brand_files: brandFiles,
        reference_files: referenceFiles,
        status: "pending", // Move from pending_briefing to pending (ready for production)
        briefing_data: {
          submitted_at: new Date().toISOString(),
          completed: true,
        },
      };

      const { error } = await supabase
        .from("design_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Briefing enviado com sucesso!",
        description: "Nossa equipe já pode começar a trabalhar no seu pedido.",
      });
      queryClient.invalidateQueries({ queryKey: ["design-order-briefing", orderId] });
      navigate(`/cliente/design/${orderId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar briefing",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitBriefing.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file uploads
  const handleBrandFileUpload = (url: string) => {
    setBrandFiles(prev => [...prev, url]);
  };

  const handleReferenceFileUpload = (url: string) => {
    setReferenceFiles(prev => [...prev, url]);
  };

  if (!orderId) {
    return (
      <ClientLayout title="Briefing">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Pedido não encontrado</p>
            <Button onClick={() => navigate("/cliente/design")} className="mt-4">
              Ver Meus Pedidos
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </ClientLayout>
    );
  }

  if (error || !order) {
    return (
      <ClientLayout title="Erro">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Não foi possível carregar o pedido</p>
            <Button onClick={() => navigate("/cliente/design")} className="mt-4">
              Ver Meus Pedidos
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  // Check if briefing is already completed
  const briefingCompleted = order.briefing_data?.completed || order.status !== "pending_briefing";

  if (briefingCompleted && order.status !== "pending_briefing") {
    return (
      <ClientLayout 
        title="Briefing Já Enviado"
        breadcrumbs={[
          { label: "Design", href: "/cliente/design" },
          { label: "Briefing" },
        ]}
      >
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Briefing já foi enviado!</h2>
            <p className="text-muted-foreground mb-6">
              Seu pedido está sendo processado por nossa equipe.
            </p>
            <Button onClick={() => navigate(`/cliente/design/${orderId}`)}>
              Ver Detalhes do Pedido
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  const categoryName = order.design_packages?.design_service_categories?.name || "Design";
  const packageName = order.design_packages?.name || "Pacote";

  return (
    <ClientLayout 
      title="Complete o Briefing"
      subtitle="Forneça as informações para iniciarmos seu projeto"
      breadcrumbs={[
        { label: "Design", href: "/cliente/design" },
        { label: "Briefing" },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Order Summary */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Pagamento Confirmado</p>
                <p className="text-sm text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">{categoryName}</Badge>
                  {packageName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Identity Section */}
        {order.has_brand_identity ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Arquivos da Marca
              </CardTitle>
              <CardDescription>
                Envie sua logomarca e outros arquivos de identidade visual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFilesSelected={(files) => {
                  // Handle file upload to supabase storage
                  files.forEach(async (file) => {
                    const path = `orders/${orderId}/brand/${file.name}`;
                    const { data, error } = await supabase.storage
                      .from("design-files")
                      .upload(path, file);
                    if (!error && data) {
                      handleBrandFileUpload(data.path);
                    }
                  });
                }}
                accept="image/*,.pdf,.ai,.psd,.svg"
                label="Enviar arquivos de marca"
                maxFiles={10}
              />
              
              {brandFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos enviados:</Label>
                  <ul className="text-sm space-y-1">
                    {brandFiles.map((file, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="truncate">{file.split("/").pop()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label htmlFor="preferred-color">Cores preferidas (opcional)</Label>
                <Input
                  id="preferred-color"
                  placeholder="Ex: Azul marinho, dourado..."
                  value={preferredColor}
                  onChange={(e) => setPreferredColor(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Criação de Marca
              </CardTitle>
              <CardDescription>
                Conte-nos sobre a marca que você deseja criar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo-description">Descreva como você imagina sua logo *</Label>
                <Textarea
                  id="logo-description"
                  placeholder="Ex: Quero uma logo moderna e minimalista que transmita profissionalismo..."
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="preferred-color">Cores preferidas</Label>
                <Input
                  id="preferred-color"
                  placeholder="Ex: Azul, verde, tons neutros..."
                  value={preferredColor}
                  onChange={(e) => setPreferredColor(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* References Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Referências e Inspirações
            </CardTitle>
            <CardDescription>
              Compartilhe exemplos do que você gosta para nos ajudar a entender seu estilo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="inspiration-urls">Links de referência (um por linha)</Label>
              <Textarea
                id="inspiration-urls"
                placeholder="https://exemplo.com/design-que-gosto&#10;https://outro-exemplo.com/inspiracao"
                value={inspirationUrls}
                onChange={(e) => setInspirationUrls(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Arquivos de referência (opcional)</Label>
              <FileUpload
                onFilesSelected={(files) => {
                  files.forEach(async (file) => {
                    const path = `orders/${orderId}/references/${file.name}`;
                    const { data, error } = await supabase.storage
                      .from("design-files")
                      .upload(path, file);
                    if (!error && data) {
                      handleReferenceFileUpload(data.path);
                    }
                  });
                }}
                accept="image/*,.pdf"
                label="Enviar referências"
                maxFiles={10}
              />
              
              {referenceFiles.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {referenceFiles.map((file, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="truncate">{file.split("/").pop()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Observações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Qualquer informação adicional que possa nos ajudar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" onClick={() => navigate("/cliente/design")}>
            Salvar Rascunho
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Enviar Briefing
              </>
            )}
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}
