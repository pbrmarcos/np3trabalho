import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Palette, Upload, Send, FileImage, CheckCircle, 
  Clock, MessageSquare, Loader2, AlertCircle, History, Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BrandManagementTabProps {
  projectId: string;
  clientId: string;
  onboarding: {
    id: string;
    company_name: string;
    needs_brand_creation: boolean;
    brand_creation_paid: boolean;
    preferred_color: string | null;
    logo_description: string | null;
    inspiration_urls: string[] | null;
    brand_status: string | null;
    brand_current_package: number | null;
    brand_versions_used: number | null;
    brand_revisions_used: number | null;
  } | null;
}

interface DesignDelivery {
  id: string;
  order_id: string;
  version_number: number;
  status: string;
  delivery_notes: string | null;
  created_at: string;
  files?: { id: string; file_name: string; file_url: string; file_type: string }[];
  feedback?: { id: string; feedback_type: string; comment: string | null; created_at: string }[];
}

interface BrandOrder {
  id: string;
  status: string;
  revisions_used: number;
  max_revisions: number;
}

const MAX_VERSIONS = 2;

export default function BrandManagementTab({ projectId, clientId, onboarding }: BrandManagementTabProps) {
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch brand design order
  const { data: brandOrder } = useQuery({
    queryKey: ["admin-brand-order", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_orders")
        .select("id, status, revisions_used, max_revisions, payment_status")
        .eq("client_id", clientId)
        .eq("package_id", "pkg-brand-creation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as (BrandOrder & { payment_status: string }) | null;
    },
    enabled: !!clientId && !!onboarding?.needs_brand_creation,
  });

  // Fetch deliveries for the brand order
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["admin-brand-deliveries", brandOrder?.id],
    queryFn: async () => {
      if (!brandOrder?.id) return [];
      
      const { data: deliveriesData, error } = await supabase
        .from("design_deliveries")
        .select("*")
        .eq("order_id", brandOrder.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch files and feedback for each delivery
      const deliveriesWithDetails = await Promise.all(
        (deliveriesData || []).map(async (delivery) => {
          const [filesResult, feedbackResult] = await Promise.all([
            supabase.from("design_delivery_files").select("*").eq("delivery_id", delivery.id),
            supabase.from("design_feedback").select("*").eq("delivery_id", delivery.id).order("created_at", { ascending: false }),
          ]);
          return {
            ...delivery,
            files: filesResult.data || [],
            feedback: feedbackResult.data || [],
          } as DesignDelivery;
        })
      );

      return deliveriesWithDetails;
    },
    enabled: !!brandOrder?.id,
  });

  const versionsUsed = deliveries?.length || 0;
  const revisionsUsed = brandOrder?.revisions_used || 0;
  const maxRevisions = brandOrder?.max_revisions || 2;
  const brandStatus = brandOrder?.status || "pending";
  const canSendNewVersion = versionsUsed < MAX_VERSIONS;

  // Send new version
  const handleSendVersion = async () => {
    if (!brandOrder?.id || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const newVersionNumber = versionsUsed + 1;

      // Create delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from("design_deliveries")
        .insert({
          order_id: brandOrder.id,
          version_number: newVersionNumber,
          status: "pending_review",
          delivery_notes: deliveryNotes.trim() || null,
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Upload files
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${clientId}/${brandOrder.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("design-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Insert file record
        const { error: fileError } = await supabase
          .from("design_delivery_files")
          .insert({
            delivery_id: delivery.id,
            file_name: file.name,
            file_url: fileName,
            file_type: fileExt,
          });

        if (fileError) throw fileError;
      }

      // Update design order status
      const { error: orderError } = await supabase
        .from("design_orders")
        .update({ status: "delivered" })
        .eq("id", brandOrder.id);

      if (orderError) throw orderError;

      // Update onboarding for backward compatibility
      if (onboarding?.id) {
        await supabase
          .from("client_onboarding")
          .update({
            brand_versions_used: newVersionNumber,
            brand_status: "pending_review",
          })
          .eq("id", onboarding.id);
      }

      // Send notification email
      await supabase.functions.invoke("send-email", {
        body: {
          template_slug: "brand_feedback_request",
          to: [clientId],
          variables: {
            client_name: onboarding?.company_name || "Cliente",
            company_name: onboarding?.company_name || "",
            feedback_url: "https://webq.com.br/cliente/design",
          },
          triggered_by: "admin",
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-brand-order"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brand-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-onboarding"] });
      
      toast.success(`Versão ${newVersionNumber} enviada com sucesso!`);
      setIsUploadDialogOpen(false);
      setSelectedFiles([]);
      setDeliveryNotes("");
    } catch (error) {
      console.error("Error sending version:", error);
      toast.error("Erro ao enviar versão");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!onboarding?.needs_brand_creation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Palette className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">Criação de marca não contratada</h3>
          <p className="text-sm text-muted-foreground">
            Este cliente não contratou o serviço de criação de marca.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!brandOrder) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="font-medium text-foreground mb-1">Processando pedido</h3>
          <p className="text-sm text-muted-foreground">
            O pedido de criação de marca está sendo processado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Briefing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Briefing do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {onboarding.preferred_color && (
              <div>
                <Label className="text-xs text-muted-foreground">Cor de preferência</Label>
                <p className="text-sm font-medium">{onboarding.preferred_color}</p>
              </div>
            )}
            {onboarding.logo_description && (
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Descrição do logo</Label>
                <p className="text-sm">{onboarding.logo_description}</p>
              </div>
            )}
          </div>

          {onboarding.inspiration_urls && (onboarding.inspiration_urls as string[]).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Referências visuais</Label>
              <div className="flex gap-2 flex-wrap">
                {(onboarding.inspiration_urls as string[]).map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`Inspiração ${i + 1}`}
                      className="h-20 w-20 object-cover rounded border border-border"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute inset-0 m-auto h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        // client-logos bucket is public, just open the URL directly
                        window.open(url, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status do Serviço</CardTitle>
            <Badge variant={brandStatus === "approved" ? "default" : "secondary"}>
              {brandStatus === "pending" && "Não iniciado"}
              {brandStatus === "in_progress" && "Em produção"}
              {brandStatus === "delivered" && "Aguardando aprovação"}
              {brandStatus === "approved" && "Aprovado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Versões:</span>{" "}
              <span className="font-medium">{versionsUsed}/{MAX_VERSIONS}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Correções:</span>{" "}
              <span className="font-medium">{revisionsUsed}/{maxRevisions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send New Version */}
      {canSendNewVersion && brandStatus !== "approved" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Enviar Nova Versão
            </CardTitle>
            <CardDescription>
              Envie a versão {versionsUsed + 1} para o cliente avaliar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Versão {versionsUsed + 1}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enviar Nova Versão</DialogTitle>
                  <DialogDescription>
                    Faça upload dos arquivos da versão {versionsUsed + 1} para {onboarding.company_name}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* File Upload */}
                  <div>
                    <Label>Arquivos *</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        id="brand-files"
                        className="hidden"
                        multiple
                        accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.eps"
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="brand-files">
                        <Button variant="outline" asChild className="w-full cursor-pointer">
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Selecionar arquivos
                          </span>
                        </Button>
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded bg-muted text-sm"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileImage className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeFile(i)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notas para o cliente</Label>
                    <Textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Ex: Seguindo suas preferências de cores..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSendVersion}
                    disabled={isUploading || selectedFiles.length === 0}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar e Notificar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Delivery History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico de Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : deliveries && deliveries.length > 0 ? (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 rounded-lg border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Versão {delivery.version_number}</span>
                    </div>
                    <Badge
                      variant={
                        delivery.status === "approved"
                          ? "default"
                          : delivery.status === "revision_requested"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {delivery.status === "pending_review" && (
                        <>
                          <Clock className="h-3 w-3 mr-1" /> Aguardando
                        </>
                      )}
                      {delivery.status === "approved" && (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" /> Aprovado
                        </>
                      )}
                      {delivery.status === "revision_requested" && (
                        <>
                          <MessageSquare className="h-3 w-3 mr-1" /> Correção solicitada
                        </>
                      )}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Enviado em {format(new Date(delivery.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>

                  {delivery.delivery_notes && (
                    <p className="text-sm text-muted-foreground">{delivery.delivery_notes}</p>
                  )}

                  {/* Files */}
                  {delivery.files && delivery.files.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {delivery.files.map((file) => (
                        <Button
                          key={file.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from('design-files')
                                .createSignedUrl(file.file_url, 3600);
                              if (error) throw error;
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              }
                            } catch (error) {
                              console.error('Error downloading file:', error);
                              toast.error('Erro ao baixar arquivo');
                            }
                          }}
                        >
                          <FileImage className="h-3 w-3" />
                          {file.file_name}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Feedback */}
                  {delivery.feedback && delivery.feedback.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      {delivery.feedback.map((fb) => (
                        <div key={fb.id} className="text-sm">
                          <Badge variant="outline" className="mr-2">
                            {fb.feedback_type === "approve" ? (
                              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            ) : (
                              <MessageSquare className="h-3 w-3 mr-1 text-orange-500" />
                            )}
                            {fb.feedback_type === "approve" ? "Aprovado" : "Correção"}
                          </Badge>
                          {fb.comment && (
                            <span className="text-muted-foreground">{fb.comment}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma versão enviada ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
