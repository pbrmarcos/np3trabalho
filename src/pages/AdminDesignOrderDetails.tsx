import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, Package, Download, Upload,
  Loader2, FileText, Image, User, Send, X
} from "lucide-react";
import { notifyDesignOrderDelivered } from "@/services/notificationService";
import ActionLogTimeline from "@/components/admin/ActionLogTimeline";
import { logDesignOrderAction } from "@/services/auditService";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando Produção", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  in_progress: { label: "Em Produção", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  delivered: { label: "Entregue", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  revision_requested: { label: "Em Revisão", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  completed: { label: "✅ Concluído - Versão Final", color: "bg-green-600/20 text-green-700 border-green-600/40" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AdminDesignOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-design-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      
      // Fetch package separately (no FK relationship)
      let packageData = null;
      if (data.package_id) {
        const { data: pkg } = await supabase
          .from('design_packages')
          .select('name, price, category_id')
          .eq('id', data.package_id)
          .maybeSingle();
        packageData = pkg;
      }
      
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', data.client_id)
        .maybeSingle();
      
      // Fetch category
      let category = null;
      if (packageData?.category_id) {
        const { data: cat } = await supabase
          .from('design_service_categories')
          .select('id, name')
          .eq('id', packageData.category_id)
          .maybeSingle();
        category = cat;
      }
      
      // For brand orders, also fetch onboarding data if order fields are empty
      let onboarding = null;
      const isBrand = packageData?.category_id === 'cat-brand';
      if (isBrand || !data.preferred_color) {
        const { data: onboardingData } = await supabase
          .from('client_onboarding')
          .select('company_name, preferred_color, logo_description, inspiration_urls')
          .eq('user_id', data.client_id)
          .maybeSingle();
        onboarding = onboardingData;
      }
      
      // Merge data
      return {
        ...data,
        package: packageData,
        category,
        profile: profile || { company_name: onboarding?.company_name, full_name: null },
        preferred_color: data.preferred_color || onboarding?.preferred_color,
        logo_description: data.logo_description || onboarding?.logo_description,
        inspiration_urls: data.inspiration_urls || onboarding?.inspiration_urls,
      } as any;
    },
    enabled: !!orderId,
  });

  const { data: deliveries } = useQuery({
    queryKey: ['admin-design-deliveries', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('design_deliveries')
        .select(`
          *,
          files:design_delivery_files(*),
          feedback:design_feedback(*)
        `)
        .eq('order_id', orderId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const oldStatus = order?.status;
      const { error } = await (supabase as any)
        .from('design_orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      return { oldStatus, newStatus };
    },
    onSuccess: async ({ oldStatus, newStatus }) => {
      toast.success('Status atualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-design-order', orderId] });
      
      // Audit log
      if (orderId && order) {
        await logDesignOrderAction(
          orderId,
          order.package?.name || 'Pedido de Design',
          'status_change',
          `Status alterado de "${oldStatus}" para "${newStatus}"`,
          { oldValue: { status: oldStatus }, newValue: { status: newStatus } }
        );
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const sendDeliveryMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      // Get next version number
      const nextVersion = (deliveries?.length || 0) + 1;

      // Create delivery
      const { data: delivery, error: deliveryError } = await (supabase as any)
        .from('design_deliveries')
        .insert({
          order_id: orderId,
          version_number: nextVersion,
          delivery_notes: deliveryNotes,
          status: 'pending_review',
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Upload files
      for (const file of deliveryFiles) {
        const fileName = `${orderId}/${delivery.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('design-files')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        // Add file record
        await (supabase as any)
          .from('design_delivery_files')
          .insert({
            delivery_id: delivery.id,
            file_name: file.name,
            file_url: fileName,
            file_type: file.type,
          });
      }

      // Update order status
      await (supabase as any)
        .from('design_orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      return { delivery, nextVersion };
    },
    onSuccess: async ({ nextVersion }) => {
      toast.success('Entrega enviada com sucesso!');
      setDeliveryNotes('');
      setDeliveryFiles([]);
      queryClient.invalidateQueries({ queryKey: ['admin-design-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-design-deliveries', orderId] });
      
      // Audit log
      if (orderId && order) {
        await logDesignOrderAction(
          orderId,
          order.package?.name || 'Pedido de Design',
          'send',
          `Entrega versão ${nextVersion} enviada`,
          { newValue: { version: nextVersion, filesCount: deliveryFiles.length } }
        );
      }
      
      // Notify client about delivery
      if (order) {
        try {
          // Calculate if this is the final version (all revisions used)
          const maxRevisions = order.max_revisions || 2;
          const revisionsUsed = order.revisions_used || 0;
          // Final version: nextVersion exceeds base versions (2) + max revisions
          const isFinalVersion = revisionsUsed >= maxRevisions;
          
          await notifyDesignOrderDelivered(
            order.client_id,
            order.profile?.company_name || order.profile?.full_name || 'Cliente',
            orderId!,
            order.package?.name || order.category?.name || 'Design',
            nextVersion
          );
        } catch (err) {
          console.error('Error notifying client:', err);
        }
      }
    },
    onError: (error) => {
      console.error('Error sending delivery:', error);
      toast.error('Erro ao enviar entrega');
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDeliveryFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setDeliveryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('design-files')
        .createSignedUrl(fileUrl, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const orderTitle = order?.package?.name || 'Pedido de Design';
  const orderPrice = order?.package?.price || 0;
  
  const breadcrumbs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Design Digital", href: "/admin/design" },
    { label: orderTitle }
  ];

  if (isLoading) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayoutWithSidebar>
    );
  }

  if (!order) {
    return (
      <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button onClick={() => navigate('/admin/design')} className="mt-4">
            Voltar
          </Button>
        </div>
      </AdminLayoutWithSidebar>
    );
  }

  // Calculate delivery status and limits
  const currentDeliveryCount = deliveries?.length || 0;
  const nextVersion = currentDeliveryCount + 1;
  const isOrderApproved = order.status === 'approved';
  
  // Delivery 3 is the last standard delivery
  // Delivery 4-5 are bonus deliveries (4 is "bonus final", 5 is also allowed)
  // Delivery 6 shows finalized message - no more deliveries allowed
  const MAX_DELIVERIES = 6;
  const STANDARD_DELIVERIES = 3;
  const isFinalDelivery = currentDeliveryCount >= STANDARD_DELIVERIES;
  const isOrderComplete = currentDeliveryCount >= MAX_DELIVERIES || isOrderApproved;
  const displayStatus = isOrderComplete ? 'completed' : order.status;
  
  const status = statusConfig[displayStatus] || statusConfig.pending;
  // Can send deliveries up to version 6 (inclusive), so can send if currentDeliveryCount < 6
  const canSendDelivery = currentDeliveryCount < MAX_DELIVERIES && order.status !== 'approved' && order.status !== 'cancelled' && deliveryFiles.length > 0;
  
  // Helper to get delivery label
  const getDeliveryLabel = (versionNumber: number) => {
    if (versionNumber <= STANDARD_DELIVERIES) {
      return `Versão ${versionNumber}`;
    } else if (versionNumber === 4) {
      return 'Bônus - Entrega Final';
    } else if (versionNumber === 5) {
      return 'Bônus Extra';
    } else if (versionNumber >= 6) {
      return 'Finalizado';
    }
    return `Versão ${versionNumber}`;
  };
  
  const getDeliveryBadge = (versionNumber: number) => {
    if (versionNumber === 4) {
      return { label: 'Bônus Final', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    } else if (versionNumber === 5) {
      return { label: 'Bônus', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' };
    } else if (versionNumber >= 6) {
      return { label: 'Entrega Final', className: 'bg-green-600/20 text-green-700 border-green-600/40' };
    }
    return null;
  };

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/design')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-semibold text-foreground">{orderTitle}</h1>
              <Badge variant="outline" className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              #{order.id.slice(0, 8)} • {order.profile?.company_name || order.profile?.full_name}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Order details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {order.profile?.company_name || order.profile?.full_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serviço:</span>
                    <p className="font-medium">{order.category?.name}</p>
                  </div>
                  {order.package && (
                    <div>
                      <span className="text-muted-foreground">Pacote:</span>
                      <p className="font-medium">{order.package.name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Modalidade:</span>
                    <p className="font-medium">{order.order_type === 'pontual' ? 'Pontual' : 'Criativo'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <p className="font-medium text-primary">R$ {Number(orderPrice).toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado em:</span>
                    <p className="font-medium">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                {order.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Descrição do cliente:</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {order.description}
                    </p>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações:</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Brand-specific fields */}
                {(order.category?.id === 'cat-brand' || order.package?.category_id === 'cat-brand') && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                      Informações de Criação de Marca
                    </h4>
                    {order.preferred_color && (
                      <div>
                        <span className="text-sm text-muted-foreground">Cores preferidas:</span>
                        <p className="mt-1 text-foreground">{order.preferred_color}</p>
                      </div>
                    )}
                    {order.logo_description && (
                      <div>
                        <span className="text-sm text-muted-foreground">Descrição da logo:</span>
                        <p className="mt-1 text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                          {order.logo_description}
                        </p>
                      </div>
                    )}
                    {order.inspiration_urls && order.inspiration_urls.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Imagens de inspiração ({order.inspiration_urls.length}):
                        </span>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {order.inspiration_urls.map((url: string, index: number) => (
                            <div 
                              key={index}
                              className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                            >
                              <img 
                                src={url} 
                                alt={`Inspiração ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute inset-0 m-auto h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  // client-logos bucket is public, just open the URL directly
                                  window.open(url, '_blank');
                                }}
                              >
                                <Download className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {order.reference_files && order.reference_files.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Arquivos de referência:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.reference_files.map((file: string, i: number) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file, file.split('/').pop() || 'arquivo')}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {file.split('/').pop()}
                          <Download className="ml-2 h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send delivery */}
            {currentDeliveryCount < MAX_DELIVERIES && order.status !== 'approved' && order.status !== 'cancelled' && (
              <Card>
                <CardHeader>
                  <CardTitle>Enviar Entrega</CardTitle>
                  <CardDescription>
                    {getDeliveryLabel(nextVersion)} • {order.revisions_used}/{order.max_revisions} revisões usadas
                    {nextVersion >= 4 && nextVersion <= 5 && (
                      <span className="ml-2 text-amber-600 font-medium">✨ Bônus</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Arquivos *</Label>
                    <div className="flex flex-wrap gap-2">
                      {deliveryFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
                          <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                          <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <label className="flex items-center gap-2 px-3 py-1 border border-dashed rounded-full cursor-pointer hover:border-primary">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Adicionar</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Adicione observações sobre esta entrega..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={() => sendDeliveryMutation.mutate()}
                    disabled={!canSendDelivery || sendDeliveryMutation.isPending || isUploading}
                    className="w-full"
                  >
                    {(sendDeliveryMutation.isPending || isUploading) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar Entrega
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Deliveries history */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                {currentDeliveryCount >= MAX_DELIVERIES && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-green-700 font-semibold">🎉 Pedido Finalizado!</p>
                    <p className="text-sm text-green-600 mt-1">Todas as entregas foram realizadas. Este pedido está concluído.</p>
                  </div>
                )}

                {deliveries && deliveries.length > 0 ? (
                  <div className="space-y-4">
                    {deliveries.map((delivery) => {
                      const deliveryBadge = getDeliveryBadge(delivery.version_number);
                      return (
                        <div key={delivery.id} className={`p-4 border rounded-lg ${delivery.version_number >= 4 ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{getDeliveryLabel(delivery.version_number)}</h4>
                                {deliveryBadge && (
                                  <Badge variant="outline" className={deliveryBadge.className}>{deliveryBadge.label}</Badge>
                                )}
                                {delivery.status === 'approved' && (
                                  <Badge className="bg-green-500">Aprovada</Badge>
                                )}
                                {delivery.status === 'revision_requested' && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-500/30">Revisão</Badge>
                                )}
                                {delivery.status === 'pending_review' && (
                                  <Badge variant="outline">Aguardando</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(delivery.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                        {delivery.delivery_notes && (
                          <p className="text-sm text-muted-foreground mb-3">{delivery.delivery_notes}</p>
                        )}

                        {delivery.files && delivery.files.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="flex flex-wrap gap-2">
                              {delivery.files.map((file: any) => (
                                <Button
                                  key={file.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadFile(file.file_url, file.file_name)}
                                >
                                  {file.file_type?.startsWith('image') ? (
                                    <Image className="mr-2 h-4 w-4" />
                                  ) : (
                                    <FileText className="mr-2 h-4 w-4" />
                                  )}
                                  {file.file_name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {delivery.feedback && delivery.feedback.length > 0 && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium mb-1">Feedback do cliente:</p>
                            {delivery.feedback.map((fb: any) => (
                              <div key={fb.id} className="text-sm">
                                <Badge variant={fb.feedback_type === 'approve' ? 'default' : 'secondary'} className="mb-1">
                                  {fb.feedback_type === 'approve' ? 'Aprovado' : 'Revisão solicitada'}
                                </Badge>
                                {fb.comment && <p className="text-muted-foreground">{fb.comment}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nenhuma entrega ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alterar Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={order.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Aguardando Produção</SelectItem>
                    <SelectItem value="in_progress">Em Produção</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="revision_requested">Em Revisão</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revisões:</span>
                  <span>{order.revisions_used}/{order.max_revisions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entregas:</span>
                  <span>{deliveries?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-primary">
                    R$ {Number(order.package?.price || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Action Log Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionLogTimeline entityType="design_order" entityId={orderId || ''} limit={8} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayoutWithSidebar>
  );
}
