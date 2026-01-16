// ============================================
// CUSTOMER PORTAL - Abre portal do Stripe para gerenciar assinatura
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders, PRODUCTION_URL } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAnonClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("CUSTOMER-PORTAL");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar client Supabase
    const supabaseClient = createAnonClient();
    
    // Verificar autenticação
    const authResult = await verifyJWT(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    if (!user.email) {
      logger.warn("User email not available", { userId: user.id });
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logger.info("Opening customer portal", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logger.warn("No Stripe customer found", { email: user.email });
      return new Response(JSON.stringify({ error: "No customer found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const customerId = customers.data[0].id;
    logger.info("Found customer", { customerId });

    // Create portal session
    const returnOrigin = req.headers.get("origin") || PRODUCTION_URL;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnOrigin}/cliente/assinatura`,
    });

    logger.info("Portal session created", { sessionId: portalSession.id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logger.error("Error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
