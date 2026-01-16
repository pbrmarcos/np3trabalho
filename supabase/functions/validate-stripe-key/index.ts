import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("VALIDATE-STRIPE-KEY");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabase = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Authenticated admin user", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("No Stripe key found in environment");
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: "STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    log("Stripe key found, testing connection");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const account = await stripe.accounts.retrieve();
    
    log("Stripe connection successful", { 
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: `Conexão estabelecida com sucesso! Conta: ${account.id}`,
        account: {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    log.error("ERROR validating Stripe key", { message: error.message });
    
    let message = "Erro desconhecido ao validar chave Stripe";
    if (error.type === "StripeAuthenticationError") message = "Chave Stripe inválida ou expirada";
    else if (error.type === "StripePermissionError") message = "Chave Stripe não tem permissões suficientes";
    else if (error.message) message = error.message;

    return new Response(
      JSON.stringify({ valid: false, message }),
      { headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" }, status: 200 }
    );
  }
});
