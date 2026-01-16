// ============================================
// CREATE CHECKOUT - Cria sessão de checkout do Stripe
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAnonClient, createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("CREATE-CHECKOUT");

// Fallback brand creation price ID (will be overridden by database config)
const FALLBACK_BRAND_CREATION_PRICE_ID = "price_1Sb36CEXNRV7tn1dnr51n9pY";

// Fallback price IDs if not in database
const FALLBACK_PRICE_IDS: Record<string, Record<string, string>> = {
  essencial: {
    monthly: "price_1Sc1kXEXNRV7tn1d10jIwaqZ",
    semester: "price_1Sc1l6EXNRV7tn1dhlYXDrss",
    annual: "price_1Sc1lXEXNRV7tn1d5MvKpDub",
    biennial: "price_1Sc1m3EXNRV7tn1duGSu3QRB"
  },
  profissional: {
    monthly: "price_1Sc1mYEXNRV7tn1dXJLBMhXD",
    semester: "price_1Sc1n5EXNRV7tn1dyLHq5s1T",
    annual: "price_1Sc1nXEXNRV7tn1dFhfLqPLw",
    biennial: "price_1Sc1o5EXNRV7tn1d8UYJNiab"
  },
  performance: {
    monthly: "price_1Sc1ogEXNRV7tn1djYUUXdPJ",
    semester: "price_1Sc1pHEXNRV7tn1dz0K6ZCCc",
    annual: "price_1Sc1ppEXNRV7tn1d9Z5aTpZq",
    biennial: "price_1Sc1qREXNRV7tn1dDjn2JTPU"
  }
};

// Input validation schema with enhanced security
const CheckoutInputSchema = z.object({
  plan_id: z.string()
    .min(1, "Plano é obrigatório")
    .max(50, "Plano inválido")
    .regex(/^[a-zA-Z0-9_-]+$/, "ID de plano com formato inválido")
    .transform(val => val.toLowerCase()),
  billing_period: z.enum(["monthly", "semester", "annual", "biennial"], {
    errorMap: () => ({ message: "Período de cobrança inválido" })
  }).default("monthly"),
  onboarding_id: z.string().uuid("ID de onboarding inválido").optional().nullable(),
  add_brand_creation: z.boolean().optional().default(false),
  promo_code: z.string()
    .max(50, "Código promocional muito longo")
    .regex(/^[A-Za-z0-9_-]*$/, "Código promocional inválido")
    .optional()
    .nullable()
    .transform(val => val ? val.trim().toUpperCase() : null),
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar clients Supabase
    const supabaseClient = createAnonClient();
    const supabaseAdmin = createAdminClient();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");
    logger.info("Stripe key verified");

    // Verificar autenticação
    const authResult = await verifyJWT(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    if (!user.email) {
      return new Response(JSON.stringify({ error: "User not authenticated or email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logger.info("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = CheckoutInputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.warn("Input validation failed", { errors });
      throw new Error(`Invalid input: ${errors}`);
    }

    const { 
      plan_id,
      billing_period,
      onboarding_id,
      add_brand_creation,
      promo_code,
    } = parseResult.data;
    
    logger.info("Request validated", { 
      plan_id,
      billing_period,
      onboarding_id,
      add_brand_creation,
      promo_code: promo_code ? "[PROVIDED]" : null,
    });

    // Get price IDs from database
    let priceIds = FALLBACK_PRICE_IDS;
    const { data: settingsData } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "hosting_price_ids")
      .maybeSingle();

    if (settingsData?.value) {
      priceIds = settingsData.value as Record<string, Record<string, string>>;
      logger.info("Loaded price IDs from database");
    } else {
      logger.info("Using fallback price IDs");
    }

    // Determine the correct price ID based on plan and billing period
    const planKey = plan_id?.toLowerCase() || "essencial";
    const periodKey = billing_period || "monthly";
    
    if (!priceIds[planKey]) {
      throw new Error(`Plan not found: ${planKey}`);
    }
    if (!priceIds[planKey][periodKey]) {
      throw new Error(`Billing period not found for plan ${planKey}: ${periodKey}`);
    }

    const price_id = priceIds[planKey][periodKey];
    logger.info("Determined price ID", { planKey, periodKey, price_id });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logger.info("Existing customer found", { customerId });
    } else {
      logger.info("No existing customer, will create new");
    }

    const requestOrigin = req.headers.get("origin") || "https://webq.com.br";

    // Determine if this is a subscription (monthly) or one-time payment (semester+)
    const isSubscription = periodKey === "monthly";
    
    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: price_id,
        quantity: 1,
      },
    ];

    // Add brand creation if requested (one-time payment)
    if (add_brand_creation) {
      // Fetch brand creation config from database
      let brandPriceId = FALLBACK_BRAND_CREATION_PRICE_ID;
      const { data: brandConfigData } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "brand_creation_config")
        .maybeSingle();

      if (brandConfigData?.value && (brandConfigData.value as any).stripe_price_id) {
        brandPriceId = (brandConfigData.value as any).stripe_price_id;
        logger.info("Loaded brand creation price ID from database", { brandPriceId });
      } else {
        logger.info("Using fallback brand creation price ID", { brandPriceId });
      }

      lineItems.push({
        price: brandPriceId,
        quantity: 1,
      });
      logger.info("Brand creation added to checkout");
    }

    // Look up promotion code if provided
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (promo_code && promo_code.trim()) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promo_code.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          discounts = [{ promotion_code: promoCodes.data[0].id }];
          logger.info("Promotion code found and applied", { code: promo_code, id: promoCodes.data[0].id });
        } else {
          logger.info("Promotion code not found, allowing manual entry", { code: promo_code });
        }
      } catch (promoError) {
        logger.warn("Error looking up promo code, allowing manual entry", { error: promoError });
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: isSubscription ? "subscription" : "payment",
      allow_promotion_codes: !discounts, // Disable if we already applied one
      discounts: discounts,
      success_url: `${requestOrigin}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${requestOrigin}/pagamento/cancelado`,
      metadata: {
        plan_id: planKey,
        billing_period: periodKey,
        user_id: user.id,
        onboarding_id: onboarding_id || "",
        add_brand_creation: add_brand_creation ? "true" : "false",
      },
    };

    // Add subscription_data only for subscription mode
    if (isSubscription) {
      sessionParams.subscription_data = {
        metadata: {
          plan_id: planKey,
          user_id: user.id,
          onboarding_id: onboarding_id || "",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logger.info("Checkout session created", { sessionId: session.id, url: session.url, mode: sessionParams.mode });

    // Update onboarding with stripe session id if provided
    if (onboarding_id) {
      await supabaseAdmin
        .from("client_onboarding")
        .update({ stripe_session_id: session.id })
        .eq("id", onboarding_id);
      
      logger.info("Onboarding updated with session ID");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
