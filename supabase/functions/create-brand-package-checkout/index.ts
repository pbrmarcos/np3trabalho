// ============================================
// CREATE BRAND PACKAGE CHECKOUT - Checkout para pacote de marca adicional
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAnonClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("BRAND-PACKAGE-CHECKOUT");

// Fallback brand creation price ID (will be overridden by database config)
const FALLBACK_BRAND_CREATION_PRICE_ID = "price_1SfXD579QmDvXBfNcUx8ZpZd";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar client Supabase
    const supabaseClient = createAnonClient();

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

    const body = await req.json();
    const { onboarding_id } = body;
    
    if (!onboarding_id) {
      throw new Error("Onboarding ID is required");
    }

    logger.info("Request body parsed", { onboarding_id });

    // Get onboarding to verify ownership and get company name
    const { data: onboarding, error: onboardingError } = await supabaseClient
      .from("client_onboarding")
      .select("*")
      .eq("id", onboarding_id)
      .eq("user_id", user.id)
      .single();

    if (onboardingError || !onboarding) {
      throw new Error("Onboarding not found or access denied");
    }

    logger.info("Onboarding found", { company_name: onboarding.company_name });

    // Fetch brand creation config from database
    let brandPriceId = FALLBACK_BRAND_CREATION_PRICE_ID;
    const { data: brandConfigData } = await supabaseClient
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

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logger.info("Existing customer found", { customerId });
    }

    const requestOrigin = req.headers.get("origin") || "https://webq.com.br";

    // Create one-time payment session for additional brand package
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: brandPriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${requestOrigin}/cliente/marca?package_success=true`,
      cancel_url: `${requestOrigin}/cliente/marca?package_cancelled=true`,
      metadata: {
        onboarding_id,
        user_id: user.id,
        package_type: "additional_brand",
        company_name: onboarding.company_name,
      },
    });

    logger.info("Checkout session created", { sessionId: session.id, url: session.url });

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
