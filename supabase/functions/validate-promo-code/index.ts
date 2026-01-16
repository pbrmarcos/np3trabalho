import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("VALIDATE-PROMO-CODE");

// Zod schema for input validation
const PromoCodeSchema = z.object({
  code: z.string()
    .min(1, "Código é obrigatório")
    .max(50, "Código muito longo")
    .transform(val => val.trim().toUpperCase()),
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Parse and validate input with Zod
    const rawBody = await req.json();
    const parseResult = PromoCodeSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || "Dados inválidos";
      logger.warn("Validation failed", { errors: parseResult.error.errors });
      return new Response(
        JSON.stringify({ valid: false, error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { code: normalizedCode } = parseResult.data;
    logger.info("Validating promo code", { code: normalizedCode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Search for promotion codes matching the input
    const promoCodes = await stripe.promotionCodes.list({
      code: normalizedCode,
      active: true,
      limit: 1,
    });

    if (promoCodes.data.length === 0) {
      logger.info("Promo code not found");
      return new Response(
        JSON.stringify({ valid: false, error: "Código não encontrado ou expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const promoCode = promoCodes.data[0];
    const coupon = promoCode.coupon;

    // Check if coupon is still valid
    if (!coupon.valid) {
      logger.info("Coupon is no longer valid");
      return new Response(
        JSON.stringify({ valid: false, error: "Cupom expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check max redemptions
    if (promoCode.max_redemptions && promoCode.times_redeemed >= promoCode.max_redemptions) {
      logger.info("Max redemptions reached");
      return new Response(
        JSON.stringify({ valid: false, error: "Cupom esgotado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check expiration
    if (promoCode.expires_at && promoCode.expires_at * 1000 < Date.now()) {
      logger.info("Promo code expired");
      return new Response(
        JSON.stringify({ valid: false, error: "Código expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build discount info
    let discountDescription = "";
    let discountPercent: number | null = null;
    let discountAmount: number | null = null;

    if (coupon.percent_off) {
      discountPercent = coupon.percent_off;
      discountDescription = `${coupon.percent_off}% de desconto`;
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off / 100; // Convert from cents
      discountDescription = `R$ ${discountAmount.toFixed(2).replace('.', ',')} de desconto`;
    }

    logger.info("Promo code valid", { 
      promoCodeId: promoCode.id,
      couponName: coupon.name,
      discountPercent,
      discountAmount
    });

    return new Response(
      JSON.stringify({
        valid: true,
        promo_code_id: promoCode.id,
        coupon_name: coupon.name || normalizedCode,
        discount_description: discountDescription,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        duration: coupon.duration,
        duration_in_months: coupon.duration_in_months,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ valid: false, error: "Erro ao validar código" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
