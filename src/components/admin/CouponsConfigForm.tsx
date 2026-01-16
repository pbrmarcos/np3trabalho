import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Ticket, Tag, Percent, DollarSign, Calendar, Users, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Coupon {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  redeem_by: number | null;
  valid: boolean;
}

interface PromotionCode {
  id: string;
  code: string;
  coupon: Coupon;
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  restrictions: {
    first_time_transaction?: boolean;
    minimum_amount?: number;
    minimum_amount_currency?: string;
  };
}

export default function CouponsConfigForm() {
  const queryClient = useQueryClient();
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [selectedCouponForPromo, setSelectedCouponForPromo] = useState<string>("");

  // New coupon form state
  const [couponForm, setCouponForm] = useState({
    name: "",
    discount_type: "percent" as "percent" | "amount",
    percent_off: "",
    amount_off: "",
    duration: "once" as "once" | "forever" | "repeating",
    duration_in_months: "",
    max_redemptions: "",
    redeem_by: "",
  });

  // New promo code form state
  const [promoForm, setPromoForm] = useState({
    code: "",
    max_redemptions: "",
    expires_at: "",
    first_time_transaction: false,
    minimum_amount: "",
  });

  // Fetch coupons
  const { data: couponsData, isLoading: loadingCoupons } = useQuery({
    queryKey: ["stripe-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "list_coupons" },
      });
      if (error) throw error;
      return data.coupons as Coupon[];
    },
  });

  // Fetch promotion codes
  const { data: promosData, isLoading: loadingPromos } = useQuery({
    queryKey: ["stripe-promotion-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "list_promotion_codes" },
      });
      if (error) throw error;
      return data.promotion_codes as PromotionCode[];
    },
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        action: "create_coupon",
        name: couponForm.name,
        duration: couponForm.duration,
      };

      if (couponForm.discount_type === "percent") {
        payload.percent_off = parseFloat(couponForm.percent_off);
      } else {
        payload.amount_off = Math.round(parseFloat(couponForm.amount_off) * 100); // Convert to cents
        payload.currency = "brl";
      }

      if (couponForm.duration === "repeating" && couponForm.duration_in_months) {
        payload.duration_in_months = parseInt(couponForm.duration_in_months);
      }

      if (couponForm.max_redemptions) {
        payload.max_redemptions = parseInt(couponForm.max_redemptions);
      }

      if (couponForm.redeem_by) {
        payload.redeem_by = couponForm.redeem_by;
      }

      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-coupons"] });
      toast.success("Cupom criado com sucesso!");
      setIsCreatingCoupon(false);
      setCouponForm({
        name: "",
        discount_type: "percent",
        percent_off: "",
        amount_off: "",
        duration: "once",
        duration_in_months: "",
        max_redemptions: "",
        redeem_by: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar cupom: ${error.message}`);
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "delete_coupon", coupon_id: couponId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["stripe-promotion-codes"] });
      toast.success("Cupom excluído!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Create promotion code mutation
  const createPromoMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        action: "create_promotion_code",
        coupon_id: selectedCouponForPromo,
        code: promoForm.code,
      };

      if (promoForm.max_redemptions) {
        payload.max_redemptions = parseInt(promoForm.max_redemptions);
      }

      if (promoForm.expires_at) {
        payload.expires_at = promoForm.expires_at;
      }

      if (promoForm.first_time_transaction) {
        payload.first_time_transaction = true;
      }

      if (promoForm.minimum_amount) {
        payload.minimum_amount = Math.round(parseFloat(promoForm.minimum_amount) * 100);
        payload.minimum_amount_currency = "brl";
      }

      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-promotion-codes"] });
      toast.success("Código promocional criado!");
      setIsCreatingPromo(false);
      setPromoForm({
        code: "",
        max_redemptions: "",
        expires_at: "",
        first_time_transaction: false,
        minimum_amount: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar código: ${error.message}`);
    },
  });

  // Deactivate promo code
  const deactivatePromoMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const { error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "deactivate_promotion_code", promotion_code_id: promoId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-promotion-codes"] });
      toast.success("Código desativado!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% OFF`;
    } else if (coupon.amount_off) {
      return `R$ ${(coupon.amount_off / 100).toFixed(2)} OFF`;
    }
    return "-";
  };

  const formatDuration = (coupon: Coupon) => {
    switch (coupon.duration) {
      case "once":
        return "Uma vez";
      case "forever":
        return "Para sempre";
      case "repeating":
        return `${coupon.duration_in_months} meses`;
      default:
        return coupon.duration;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Códigos Promocionais
          </TabsTrigger>
        </TabsList>

        {/* Cupons Tab */}
        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Cupons de Desconto</CardTitle>
                  <CardDescription>
                    Cupons definem o tipo de desconto. Use códigos promocionais para criar códigos específicos.
                  </CardDescription>
                </div>
                <Dialog open={isCreatingCoupon} onOpenChange={setIsCreatingCoupon}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Cupom
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Cupom de Desconto</DialogTitle>
                      <DialogDescription>
                        Defina o tipo e valor do desconto que será aplicado.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Nome do Cupom</Label>
                        <Input
                          placeholder="Ex: Desconto de Natal"
                          value={couponForm.name}
                          onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Desconto</Label>
                        <Select
                          value={couponForm.discount_type}
                          onValueChange={(v: "percent" | "amount") => setCouponForm({ ...couponForm, discount_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentual (%)</SelectItem>
                            <SelectItem value="amount">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {couponForm.discount_type === "percent" ? (
                        <div className="space-y-2">
                          <Label>Percentual de Desconto</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="20"
                              value={couponForm.percent_off}
                              onChange={(e) => setCouponForm({ ...couponForm, percent_off: e.target.value })}
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Valor do Desconto</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              min="1"
                              placeholder="50"
                              value={couponForm.amount_off}
                              onChange={(e) => setCouponForm({ ...couponForm, amount_off: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Duração</Label>
                        <Select
                          value={couponForm.duration}
                          onValueChange={(v: "once" | "forever" | "repeating") => setCouponForm({ ...couponForm, duration: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Uma vez (primeiro pagamento)</SelectItem>
                            <SelectItem value="forever">Para sempre</SelectItem>
                            <SelectItem value="repeating">Repetindo por X meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {couponForm.duration === "repeating" && (
                        <div className="space-y-2">
                          <Label>Número de Meses</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="3"
                            value={couponForm.duration_in_months}
                            onChange={(e) => setCouponForm({ ...couponForm, duration_in_months: e.target.value })}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Limite de Usos (opcional)</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="100"
                          value={couponForm.max_redemptions}
                          onChange={(e) => setCouponForm({ ...couponForm, max_redemptions: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Expiração (opcional)</Label>
                        <Input
                          type="date"
                          value={couponForm.redeem_by}
                          onChange={(e) => setCouponForm({ ...couponForm, redeem_by: e.target.value })}
                        />
                      </div>

                      <Button
                        onClick={() => createCouponMutation.mutate()}
                        disabled={!couponForm.name || createCouponMutation.isPending || 
                          (couponForm.discount_type === "percent" && !couponForm.percent_off) ||
                          (couponForm.discount_type === "amount" && !couponForm.amount_off)}
                        className="w-full"
                      >
                        {createCouponMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Criar Cupom
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCoupons ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : couponsData && couponsData.length > 0 ? (
                <div className="space-y-3">
                  {couponsData.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {coupon.percent_off ? (
                            <Percent className="h-5 w-5 text-primary" />
                          ) : (
                            <DollarSign className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{coupon.name}</span>
                            <Badge variant={coupon.valid ? "default" : "secondary"}>
                              {coupon.valid ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">{formatDiscount(coupon)}</span>
                            <span>•</span>
                            <span>{formatDuration(coupon)}</span>
                            {coupon.max_redemptions && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {coupon.times_redeemed}/{coupon.max_redemptions}
                                </span>
                              </>
                            )}
                            {coupon.redeem_by && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  até {format(new Date(coupon.redeem_by * 1000), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCouponForPromo(coupon.id);
                            setIsCreatingPromo(true);
                          }}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          Criar Código
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Excluir este cupom? Códigos promocionais associados também serão afetados.")) {
                              deleteCouponMutation.mutate(coupon.id);
                            }
                          }}
                          disabled={deleteCouponMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum cupom criado ainda.</p>
                  <p className="text-sm">Crie seu primeiro cupom de desconto!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Códigos Promocionais Tab */}
        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Códigos Promocionais</CardTitle>
                  <CardDescription>
                    Códigos que clientes podem usar no checkout para aplicar um cupom.
                  </CardDescription>
                </div>
                <Dialog open={isCreatingPromo} onOpenChange={setIsCreatingPromo}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!couponsData || couponsData.length === 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Código
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Código Promocional</DialogTitle>
                      <DialogDescription>
                        Códigos promocionais permitem que clientes usem cupons no checkout.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Cupom Vinculado</Label>
                        <Select
                          value={selectedCouponForPromo}
                          onValueChange={setSelectedCouponForPromo}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cupom" />
                          </SelectTrigger>
                          <SelectContent>
                            {couponsData?.filter(c => c.valid).map((coupon) => (
                              <SelectItem key={coupon.id} value={coupon.id}>
                                {coupon.name} ({formatDiscount(coupon)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Código (será convertido para maiúsculas)</Label>
                        <Input
                          placeholder="Ex: NATAL2024"
                          value={promoForm.code}
                          onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Limite de Usos (opcional)</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="100"
                          value={promoForm.max_redemptions}
                          onChange={(e) => setPromoForm({ ...promoForm, max_redemptions: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Expiração (opcional)</Label>
                        <Input
                          type="date"
                          value={promoForm.expires_at}
                          onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={promoForm.first_time_transaction}
                          onCheckedChange={(checked) => setPromoForm({ ...promoForm, first_time_transaction: checked })}
                        />
                        <Label>Apenas para primeira compra</Label>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor Mínimo de Compra (opcional)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="100"
                            value={promoForm.minimum_amount}
                            onChange={(e) => setPromoForm({ ...promoForm, minimum_amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => createPromoMutation.mutate()}
                        disabled={!selectedCouponForPromo || !promoForm.code || createPromoMutation.isPending}
                        className="w-full"
                      >
                        {createPromoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Criar Código
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPromos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : promosData && promosData.length > 0 ? (
                <div className="space-y-3">
                  {promosData.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-accent">
                          <Tag className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-lg">{promo.code}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(promo.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Badge variant={promo.active ? "default" : "secondary"}>
                              {promo.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{promo.coupon.name}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">
                              {promo.coupon.percent_off 
                                ? `${promo.coupon.percent_off}% OFF` 
                                : `R$ ${((promo.coupon.amount_off || 0) / 100).toFixed(2)} OFF`}
                            </span>
                            {promo.max_redemptions && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {promo.times_redeemed}/{promo.max_redemptions}
                                </span>
                              </>
                            )}
                            {promo.expires_at && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  até {format(new Date(promo.expires_at * 1000), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </>
                            )}
                            {promo.restrictions?.first_time_transaction && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">1ª compra</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {promo.active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Desativar este código promocional?")) {
                                deactivatePromoMutation.mutate(promo.id);
                              }
                            }}
                            disabled={deactivatePromoMutation.isPending}
                          >
                            Desativar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum código promocional criado.</p>
                  <p className="text-sm">Crie um cupom primeiro e depois vincule códigos a ele.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
