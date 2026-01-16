import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("MANAGE-COUPONS");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createAdminClient();

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");
    log("Stripe key verified");

    // Verificar admin
    const authResult = await requireAdmin(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;
    
    log("Admin verified", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.json();
    const { action } = body;

    log("Action requested", { action });

    switch (action) {
      case "list_coupons": {
        const coupons = await stripe.coupons.list({ limit: 100 });
        log("Coupons listed", { count: coupons.data.length });
        return new Response(JSON.stringify({ coupons: coupons.data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_coupon_metrics": {
        const coupons = await stripe.coupons.list({ limit: 100 });
        const promotionCodes = await stripe.promotionCodes.list({ limit: 100 });
        const invoices = await stripe.invoices.list({ limit: 100, status: "paid" });
        
        const totalCoupons = coupons.data.length;
        const activeCoupons = coupons.data.filter((c: Stripe.Coupon) => c.valid).length;
        const totalPromoCodes = promotionCodes.data.length;
        const activePromoCodes = promotionCodes.data.filter((p: Stripe.PromotionCode) => p.active).length;
        
        const totalRedemptions = coupons.data.reduce((sum: number, c: Stripe.Coupon) => sum + c.times_redeemed, 0);
        
        let totalDiscountGiven = 0;
        const couponUsageMap: Record<string, { name: string; redemptions: number; discountGiven: number }> = {};
        
        invoices.data.forEach((invoice: Stripe.Invoice) => {
          if (invoice.discount && invoice.discount.coupon) {
            const coupon = invoice.discount.coupon;
            const discountAmount = invoice.total_discount_amounts?.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0) || 0;
            totalDiscountGiven += discountAmount;
            
            const couponId = typeof coupon === 'string' ? coupon : coupon.id;
            const couponName = typeof coupon === 'string' ? coupon : (coupon.name || coupon.id);
            
            if (!couponUsageMap[couponId]) {
              couponUsageMap[couponId] = { name: couponName, redemptions: 0, discountGiven: 0 };
            }
            couponUsageMap[couponId].redemptions += 1;
            couponUsageMap[couponId].discountGiven += discountAmount;
          }
        });

        const invoicesWithDiscount = invoices.data.filter((i: Stripe.Invoice) => i.discount).length;
        const conversionRate = invoices.data.length > 0 
          ? Math.round((invoicesWithDiscount / invoices.data.length) * 100) 
          : 0;

        const metrics = {
          totalCoupons,
          activeCoupons,
          totalPromoCodes,
          activePromoCodes,
          totalRedemptions,
          totalDiscountGiven: totalDiscountGiven / 100,
          conversionRate,
          couponUsage: Object.entries(couponUsageMap).map(([id, data]) => ({
            id, ...data, discountGiven: data.discountGiven / 100,
          })).sort((a, b) => b.redemptions - a.redemptions),
          recentRedemptions: promotionCodes.data
            .filter((p: Stripe.PromotionCode) => p.times_redeemed > 0)
            .map((p: Stripe.PromotionCode) => {
              const coupon = p.coupon;
              return {
                code: p.code,
                couponName: coupon.name || coupon.id,
                timesRedeemed: p.times_redeemed,
                discount: coupon.percent_off 
                  ? `${coupon.percent_off}%` 
                  : `R$ ${((coupon.amount_off || 0) / 100).toFixed(2)}`,
              };
            })
            .sort((a: { timesRedeemed: number }, b: { timesRedeemed: number }) => b.timesRedeemed - a.timesRedeemed),
        };

        log("Coupon metrics calculated", metrics);
        return new Response(JSON.stringify({ metrics }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "create_coupon": {
        const { name, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions, redeem_by } = body;

        const couponParams: Stripe.CouponCreateParams = { name, duration: duration || "once" };

        if (percent_off) couponParams.percent_off = percent_off;
        else if (amount_off) {
          couponParams.amount_off = amount_off;
          couponParams.currency = currency || "brl";
        }

        if (duration === "repeating" && duration_in_months) couponParams.duration_in_months = duration_in_months;
        if (max_redemptions) couponParams.max_redemptions = max_redemptions;
        if (redeem_by) couponParams.redeem_by = Math.floor(new Date(redeem_by).getTime() / 1000);

        const coupon = await stripe.coupons.create(couponParams);
        log("Coupon created", { couponId: coupon.id });

        return new Response(JSON.stringify({ coupon }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "delete_coupon": {
        const { coupon_id } = body;
        await stripe.coupons.del(coupon_id);
        log("Coupon deleted", { couponId: coupon_id });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "list_promotion_codes": {
        const promotionCodes = await stripe.promotionCodes.list({ limit: 100, active: true });
        log("Promotion codes listed", { count: promotionCodes.data.length });

        return new Response(JSON.stringify({ promotion_codes: promotionCodes.data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "create_promotion_code": {
        const { coupon_id, code, max_redemptions: promo_max_redemptions, expires_at, first_time_transaction, minimum_amount, minimum_amount_currency } = body;

        const promoParams: Stripe.PromotionCodeCreateParams = { coupon: coupon_id, code: code.toUpperCase() };

        if (promo_max_redemptions) promoParams.max_redemptions = promo_max_redemptions;
        if (expires_at) promoParams.expires_at = Math.floor(new Date(expires_at).getTime() / 1000);
        if (first_time_transaction) promoParams.restrictions = { first_time_transaction: true };
        if (minimum_amount) {
          promoParams.restrictions = {
            ...promoParams.restrictions,
            minimum_amount,
            minimum_amount_currency: minimum_amount_currency || "brl",
          };
        }

        const promotionCode = await stripe.promotionCodes.create(promoParams);
        log("Promotion code created", { code: promotionCode.code });

        return new Response(JSON.stringify({ promotion_code: promotionCode }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "deactivate_promotion_code": {
        const { promotion_code_id } = body;
        const deactivated = await stripe.promotionCodes.update(promotion_code_id, { active: false });
        log("Promotion code deactivated", { id: promotion_code_id });

        return new Response(JSON.stringify({ promotion_code: deactivated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
