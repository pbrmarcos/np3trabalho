import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, Package, Download,
  Loader2, FileText, Image, ThumbsUp, Edit3, RefreshCw, Sparkles, ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  notifyDesignOrderApproved, 
  notifyDesignOrderRevisionRequested 
} from "@/services/notificationService";
import ConfettiEffect from "@/components/ConfettiEffect";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Aguardando Produção", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "Em Produção", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  delivered: { label: "Entregue", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: <Package className="h-4 w-4" /> },
  revision_requested: { label: "Em Revisão", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: <AlertCircle className="h-4 w-4" /> },
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: <CheckCircle2 className="h-4 w-4" /> },
  completed: { label: "✅ Concluído - Versão Final", color: "bg-green-600/20 text-green-700 border-green-600/40", icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertCircle className="h-4 w-4" /> },
};

interface DesignOrder {
  id: string;
  status: string;
  revisions_used: number;
  max_revisions: number;
  notes: string | null;
  created_at: string;
  package_id: string;
  package: { 
    name: string; 
    price: number;
    description: string | null;
    category: { name: string } | null;
  } | null;
}

interface DeliveryFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
}

interface DesignDelivery {
  id: string;
  version_number: number;
  status: string;
  delivery_notes: string | null;
  created_at: string;
  files?: DeliveryFile[];
}

export default function ClientDesignOrderDetails() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [revisionComment, setRevisionComment] = useState('');
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fetch client profile for notification data
  const { data: clientProfile } = useQuery({
    queryKey: ['client-profile', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', user?.id)
        .single();
      
      if (profile?.full_name || profile?.company_name) return profile;
      
      const { data: onboarding } = await supabase
        .from('client_onboarding')
        .select('company_name')
        .eq('user_id', user?.id)
        .single();
      
      return { full_name: null, company_name: onboarding?.company_name || null };
    },
    enabled: !!user?.id,
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['design-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_orders')
        .select(`
          *,
          package:design_packages(
            name, 
            price,
            description,
            category:design_service_categories(name)
          )
        `)
        .eq('id', orderId)
        .eq('client_id', user?.id)
        .single();
      
      if (error) throw error;
      return data as unknown as DesignOrder;
    },
    enabled: !!orderId && !!user?.id,
  });

  const { data: deliveries } = useQuery({
    queryKey: ['design-deliveries', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_deliveries')
        .select(`
          *,
          files:design_delivery_files(*)
        `)
        .eq('order_id', orderId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DesignDelivery[];
    },
    enabled: !!orderId,
  });

  // Query recommended packages for upselling
  const { data: recommendedPackages } = useQuery({
    queryKey: ['recommended-packages', order?.package?.category?.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_packages')
        .select(`
          id, name, price, description,
          category:design_service_categories(id, name)
        `)
        .eq('is_active', true)
        .neq('id', order?.package_id || '')
        .limit(6);
      
      if (error) throw error;
      return data;
    },
    enabled: !!order,
  });

  const latestDelivery = deliveries?.[0];
  const currentDeliveryCount = deliveries?.length || 0;
  
  // Delivery constants - same as admin
  const MAX_DELIVERIES = 6;
  const STANDARD_DELIVERIES = 3;
  
  // Determine if this is the final delivery (version 4+ or approved)
  const isOrderApproved = order?.status === 'approved';
  const isOrderComplete = currentDeliveryCount >= STANDARD_DELIVERIES || isOrderApproved;
  const isFullyFinalized = currentDeliveryCount >= MAX_DELIVERIES;
  
  // Helper to get delivery label (matching admin)
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
  
  const getDeliveryBadge = (versionNumber: number, isLatest: boolean) => {
    if (versionNumber === 4) {
      return { label: 'Bônus Final', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    } else if (versionNumber === 5) {
      return { label: 'Bônus', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' };
    } else if (versionNumber >= 6) {
      return { label: 'Entrega Final', className: 'bg-green-600/20 text-green-700 border-green-600/40' };
    } else if (isLatest && isOrderComplete) {
      return { label: 'Versão Final', className: 'bg-green-600 text-white' };
    }
    return null;
  };
  
  // Trigger confetti when order is complete and has deliveries
  useEffect(() => {
    if (isOrderComplete && deliveries && deliveries.length > 0 && !isLoading) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowConfetti(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOrderComplete, deliveries, isLoading]);
  
  const canApprove = latestDelivery?.status === 'pending_review' && !isOrderComplete;
  const canRequestRevision = latestDelivery?.status === 'pending_review' && !isOrderComplete && (order?.revisions_used || 0) < (order?.max_revisions || 2);

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Update delivery status
      const { error: deliveryError } = await supabase
        .from('design_deliveries')
        .update({ status: 'approved' })
        .eq('id', latestDelivery?.id);

      if (deliveryError) throw deliveryError;

      // Update order status
      const { error: orderError } = await supabase
        .from('design_orders')
        .update({ status: 'approved' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add feedback
      const { error: feedbackError } = await supabase
        .from('design_feedback')
        .insert({
          delivery_id: latestDelivery?.id,
          user_id: user?.id,
          feedback_type: 'approve',
        });

      if (feedbackError) throw feedbackError;

      // Notify admins with correct client/company names
      if (user?.id && orderId && order?.package?.name) {
        const clientName = clientProfile?.full_name || user?.email || 'Cliente';
        const companyName = clientProfile?.company_name || clientProfile?.full_name || 'Cliente';
        await notifyDesignOrderApproved(
          clientName,
          companyName,
          orderId,
          order.package.name
        );
      }
    },
    onSuccess: () => {
      toast.success('Pedido aprovado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['design-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['design-deliveries', orderId] });
    },
    onError: (error) => {
      console.error('Erro ao aprovar pedido:', error);
      toast.error('Erro ao aprovar pedido');
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async () => {
      // Update delivery status
      const { error: deliveryError } = await supabase
        .from('design_deliveries')
        .update({ status: 'revision_requested' })
        .eq('id', latestDelivery?.id);

      if (deliveryError) throw deliveryError;

      // Update order status and increment revisions
      const { error: orderError } = await supabase
        .from('design_orders')
        .update({ 
          status: 'revision_requested',
          revisions_used: (order?.revisions_used || 0) + 1 
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add feedback
      const { error: feedbackError } = await supabase
        .from('design_feedback')
        .insert({
          delivery_id: latestDelivery?.id,
          user_id: user?.id,
          feedback_type: 'revision',
          comment: revisionComment,
        });

      if (feedbackError) throw feedbackError;

      // Notify admins with correct client/company names
      if (user?.id && orderId && order?.package?.name && latestDelivery) {
        const clientName = clientProfile?.full_name || user?.email || 'Cliente';
        const companyName = clientProfile?.company_name || clientProfile?.full_name || 'Cliente';
        await notifyDesignOrderRevisionRequested(
          clientName,
          companyName,
          orderId,
          order.package.name,
          revisionComment
        );
      }
    },
    onSuccess: () => {
      toast.success('Correção solicitada');
      setShowRevisionDialog(false);
      setRevisionComment('');
      queryClient.invalidateQueries({ queryKey: ['design-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['design-deliveries', orderId] });
    },
    onError: (error) => {
      console.error('Erro ao solicitar correção:', error);
      toast.error('Erro ao solicitar correção');
    },
  });

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

  const packageName = order?.package?.name || "Pedido";
  const categoryName = order?.package?.category?.name || "Design Digital";
  const price = order?.package?.price || 0;

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: "Design Digital", href: "/cliente/design" },
    { label: packageName }
  ];

  if (isLoading) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!order) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button onClick={() => navigate('/cliente/design')} className="mt-4">
            Voltar aos Pedidos
          </Button>
        </div>
      </ClientLayout>
    );
  }

  // Use 'completed' status for final deliveries
  const displayStatus = isOrderComplete ? 'completed' : order.status;
  const status = statusConfig[displayStatus] || statusConfig.pending;

  return (
    <ClientLayout breadcrumbs={breadcrumbs}>
      <ConfettiEffect show={showConfetti} />
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cliente/design')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-semibold text-foreground">{packageName}</h1>
              <Badge variant="outline" className={status.color}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground">
              #{order.id.slice(0, 8)} • Criado em {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Serviço:</span>
                    <p className="font-medium">{categoryName}</p>
                  </div>
                  {order.package && (
                    <div>
                      <span className="text-muted-foreground">Pacote:</span>
                      <p className="font-medium">{order.package.name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <p className="font-medium text-primary">R$ {Number(price).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                {order.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações:</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
                {order.package?.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Descrição do pacote:</span>
                    <p className="mt-1 text-foreground text-sm">{order.package.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Entregas</CardTitle>
                <CardDescription>
                  {isOrderComplete ? (
                    <span className="text-green-600 font-medium">Pedido concluído</span>
                  ) : (
                    `${order.revisions_used}/${order.max_revisions} revisões utilizadas`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Final delivery banner */}
                {isOrderComplete && deliveries && deliveries.length > 0 && (
                  <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">🎉 Esta é a versão final do seu pedido!</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Os arquivos estão disponíveis para download abaixo.
                    </p>
                  </div>
                )}

                {isFullyFinalized && (
                  <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-green-700 font-semibold">🎉 Pedido Finalizado!</p>
                    <p className="text-sm text-green-600 mt-1">Todas as entregas foram realizadas. Este pedido está concluído.</p>
                  </div>
                )}

                {deliveries && deliveries.length > 0 ? (
                  <div className="space-y-4">
                    {deliveries.map((delivery, index) => {
                      const deliveryBadge = getDeliveryBadge(delivery.version_number, index === 0);
                      const isBonus = delivery.version_number >= 4;
                      
                      return (
                        <div 
                          key={delivery.id} 
                          className={`p-4 border rounded-lg ${
                            isBonus
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : index === 0 && isOrderComplete 
                                ? 'border-green-500/50 bg-green-500/5' 
                                : index === 0 
                                  ? 'border-primary/50 bg-primary/5' 
                                  : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{getDeliveryLabel(delivery.version_number)}</h4>
                                {deliveryBadge && (
                                  <Badge variant="outline" className={deliveryBadge.className}>{deliveryBadge.label}</Badge>
                                )}
                                {index === 0 && !isOrderComplete && !deliveryBadge && (
                                  <Badge variant="secondary">Mais Recente</Badge>
                                )}
                                {delivery.status === 'approved' && !isOrderComplete && (
                                  <Badge className="bg-green-500">Aprovada</Badge>
                                )}
                                {delivery.status === 'revision_requested' && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-500/30">Revisão Solicitada</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(delivery.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                        {delivery.delivery_notes && (
                          <p className="text-sm text-muted-foreground mb-3">{delivery.delivery_notes}</p>
                        )}

                        {delivery.files && delivery.files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Arquivos:</p>
                            <div className="flex flex-wrap gap-2">
                              {delivery.files.map((file) => (
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
                                  <Download className="ml-2 h-4 w-4" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons - only show if NOT final delivery */}
                        {index === 0 && delivery.status === 'pending_review' && !isOrderComplete && (
                          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3">
                            {canApprove && (
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => approveMutation.mutate()}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsUp className="mr-2 h-4 w-4" />
                                )}
                                Aprovar
                              </Button>
                            )}
                            {canRequestRevision && (
                              <Button 
                                variant="outline"
                                onClick={() => setShowRevisionDialog(true)}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Solicitar Correção
                              </Button>
                            )}
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
                    <p className="text-sm text-muted-foreground">Nossa equipe está trabalhando no seu pedido</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {status.icon}
                    <span className="font-medium">{status.label}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        isOrderComplete ? 'w-full bg-green-500' :
                        order.status === 'approved' ? 'w-full bg-green-500' :
                        order.status === 'delivered' ? 'w-3/4 bg-purple-500' :
                        order.status === 'in_progress' ? 'w-1/2 bg-blue-500' :
                        order.status === 'revision_requested' ? 'w-2/3 bg-orange-500' :
                        'w-1/4 bg-yellow-500'
                      }`}
                    />
                  </div>
                </div>
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
                    R$ {Number(price).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Continue with WebQ - Only show when order is complete */}
            {isOrderComplete && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Continue com a WebQ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reorder same product */}
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Novo Pedido</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Compre novamente o mesmo serviço
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">
                        R$ {Number(price).toFixed(2).replace('.', ',')}
                      </span>
                      <Button asChild size="sm" className="h-7 text-xs">
                        <Link to={`/design/checkout?package=${order.package_id}`}>
                          Comprar
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Other recommended services */}
                  {recommendedPackages && recommendedPackages.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Outros serviços</p>
                      <div className="space-y-2">
                        {recommendedPackages.slice(0, 3).map((pkg: any) => (
                          <div 
                            key={pkg.id}
                            className="flex items-center justify-between p-2 border rounded hover:border-primary/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-xs">{pkg.name}</p>
                              <p className="text-xs text-primary font-semibold">
                                R$ {Number(pkg.price).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-6 text-xs px-2">
                              <Link to={`/design/checkout?package=${pkg.id}`}>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="link" className="w-full mt-2 h-7 text-xs" asChild>
                        <Link to="/design">
                          Ver todos
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Revision Dialog */}
        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Correção</DialogTitle>
              <DialogDescription>
                Descreva o que precisa ser alterado. Você tem {order.max_revisions - order.revisions_used} revisão(ões) restante(s).
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Descreva as alterações necessárias..."
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => revisionMutation.mutate()}
                disabled={!revisionComment.trim() || revisionMutation.isPending}
              >
                {revisionMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Solicitar Correção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
