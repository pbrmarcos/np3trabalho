// ============================================
// CREATE DESIGN ORDER CHECKOUT - Cria checkout para pedido de design
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAnonClient, createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("DESIGN-ORDER-CHECKOUT");

// Input schema for design order checkout
const DesignOrderInputSchema = z.object({
  package_id: z.string().min(1, "Package ID is required"),
  has_brand_identity: z.boolean().default(false),
  wants_logo_creation: z.boolean().default(false),
  whatsapp: z.string().min(10, "WhatsApp is required"),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
});

// Logo creation addon price in cents (R$150,00)
const LOGO_CREATION_PRICE_CENTS = 15000;

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

    // Parse and validate request body
    const rawBody = await req.json();
    const parseResult = DesignOrderInputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.warn("Input validation failed", { errors });
      throw new Error(`Invalid input: ${errors}`);
    }

    const input = parseResult.data;
    logger.info("Input validated", input);

    // Get package details
    const { data: packageData, error: packageError } = await supabaseClient
      .from("design_packages")
      .select(`
        *,
        category:design_service_categories(id, name)
      `)
      .eq("id", input.package_id)
      .single();

    if (packageError || !packageData) {
      throw new Error("Package not found");
    }

    logger.info("Package found", { 
      name: packageData.name, 
      price: packageData.price,
      stripe_price_id: packageData.stripe_price_id
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logger.info("Existing customer found", { customerId });
    }

    // Update profile with WhatsApp
    await supabaseAdmin
      .from("profiles")
      .update({ phone: input.whatsapp })
      .eq("user_id", user.id);

    // Create design order with pending_payment status
    const { data: order, error: orderError } = await supabaseAdmin
      .from("design_orders")
      .insert({
        client_id: user.id,
        package_id: input.package_id,
        has_brand_identity: input.has_brand_identity,
        status: "pending_payment",
        payment_status: "pending",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        max_revisions: 2,
        revisions_used: 0,
        briefing_data: {
          wants_logo_creation: input.wants_logo_creation,
        },
      })
      .select()
      .single();

    if (orderError) {
      logger.error("Failed to create design order", { error: orderError.message });
      throw new Error("Failed to create order");
    }

    logger.info("Design order created", { orderId: order.id });

    const checkoutOrigin = req.headers.get("origin") || "https://webq.com.br";

    // Build line items
    const lineItems: Array<{ price?: string; price_data?: any; quantity: number }> = [];

    // Main package
    if (packageData.stripe_price_id) {
      lineItems.push({
        price: packageData.stripe_price_id,
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: packageData.name,
            description: `${(packageData.category as any)?.name || 'Design'} - ${packageData.name}`,
          },
          unit_amount: Math.round(Number(packageData.price) * 100),
        },
        quantity: 1,
      });
    }

    // Add logo creation if requested
    if (input.wants_logo_creation) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Criação de Logomarca",
            description: "Logomarca profissional com arquivos editáveis",
          },
          unit_amount: LOGO_CREATION_PRICE_CENTS,
        },
        quantity: 1,
      });
      logger.info("Added logo creation addon");
    }

    // Create checkout session - redirect to briefing after payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${checkoutOrigin}/cliente/design/briefing?order=${order.id}`,
      cancel_url: `${checkoutOrigin}/design/checkout?package=${input.package_id}`,
      metadata: {
        package_type: "design_order",
        order_id: order.id,
        package_id: input.package_id,
        user_id: user.id,
        includes_logo_creation: input.wants_logo_creation ? "true" : "false",
      },
    });

    // Update order with stripe session id
    await supabaseAdmin
      .from("design_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    logger.info("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url, 
      session_id: session.id,
      order_id: order.id 
    }), {
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
