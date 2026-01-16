import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("VALIDATE-PRICE-IDS");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin verified", { userId: user.id });

    const { priceIds } = await req.json();
    
    if (!priceIds || !Array.isArray(priceIds)) {
      throw new Error("Invalid request: priceIds array required");
    }

    // Filter out empty strings
    const idsToValidate = priceIds.filter((id: string) => id && id.trim() !== '');
    
    if (idsToValidate.length === 0) {
      return new Response(JSON.stringify({ valid: true, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    log("Validating price IDs", { count: idsToValidate.length });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const results: Array<{
      priceId: string;
      valid: boolean;
      error?: string;
      nickname?: string;
      unitAmount?: number;
      currency?: string;
      recurring?: boolean;
      interval?: string;
      productName?: string;
    }> = [];

    for (const priceId of idsToValidate) {
      try {
        const price = await stripe.prices.retrieve(priceId, {
          expand: ['product']
        });
        
        const product = price.product as Stripe.Product;
        
        results.push({
          priceId,
          valid: true,
          nickname: price.nickname || undefined,
          unitAmount: price.unit_amount || 0,
          currency: price.currency,
          recurring: !!price.recurring,
          interval: price.recurring?.interval,
          productName: product?.name,
        });
        
        log("Price validated", { priceId, amount: price.unit_amount, currency: price.currency });
      } catch (err: any) {
        results.push({
          priceId,
          valid: false,
          error: err.message || "Price not found",
        });
        log.warn("Price invalid", { priceId, error: err.message });
      }
    }

    const allValid = results.every(r => r.valid);

    return new Response(JSON.stringify({ valid: allValid, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Error in function", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
