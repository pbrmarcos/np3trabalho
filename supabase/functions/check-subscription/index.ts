// ============================================
// CHECK SUBSCRIPTION - Verifica status da assinatura (JWT OPCIONAL)
// ============================================
// NOTA: Esta função NÃO usa verifyJWT() porque permite acesso sem autenticação
// Retorna subscribed: false para usuários não autenticados

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAnonClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("CHECK-SUBSCRIPTION");

const PLAN_MAP: Record<string, string> = {
  "prod_TcmmXZCeenFbhJ": "Essencial",
  "prod_TcmmVfLgHMvhWJ": "Profissional",
  "prod_TcmmzT3gb1vkQi": "Performance",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createAnonClient();

    // JWT é OPCIONAL nesta função - retorna false se não autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false, plan_name: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      logger.info("User not authenticated", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false, plan_name: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const email = userData.user.email;
    logger.info("Checking subscription", { email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      logger.info("No Stripe customer found", { email });
      return new Response(JSON.stringify({ subscribed: false, plan_name: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logger.info("Found customer", { customerId });

    // Check for active recurring subscriptions first
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const productId = subscription.items.data[0]?.price?.product as string;
      const planName = PLAN_MAP[productId] || null;

      const startDate = subscription.start_date;
      const endDate = subscription.current_period_end;
      
      const subscriptionStart = startDate && !isNaN(startDate) 
        ? new Date(startDate * 1000).toISOString() 
        : null;
      const subscriptionEnd = endDate && !isNaN(endDate) 
        ? new Date(endDate * 1000).toISOString() 
        : null;

      logger.info("Active subscription found", { productId, planName, subscriptionStart, subscriptionEnd });

      return new Response(JSON.stringify({ 
        subscribed: true, 
        plan_name: planName,
        subscription_start: subscriptionStart,
        subscription_end: subscriptionEnd,
        payment_type: "recurring",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for one-time payments (non-monthly billing periods)
    logger.info("No recurring subscription, checking one-time payments...");
    
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 20,
    });

    // Find the most recent paid one-time payment session for hosting plans
    const oneTimePayment = sessions.data.find((session: Stripe.Checkout.Session) => 
      session.mode === 'payment' && 
      session.payment_status === 'paid' &&
      session.metadata?.billing_period &&
      session.metadata?.billing_period !== 'monthly' &&
      session.metadata?.plan_id
    );

    if (oneTimePayment) {
      const billingPeriod = oneTimePayment.metadata?.billing_period;
      const planId = oneTimePayment.metadata?.plan_id;
      const purchaseDate = new Date(oneTimePayment.created * 1000);
      let expirationDate: Date;

      // Calculate expiration based on billing period
      switch (billingPeriod) {
        case 'semester':
          expirationDate = new Date(purchaseDate);
          expirationDate.setMonth(expirationDate.getMonth() + 6);
          break;
        case 'annual':
          expirationDate = new Date(purchaseDate);
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          break;
        case 'biennial':
          expirationDate = new Date(purchaseDate);
          expirationDate.setFullYear(expirationDate.getFullYear() + 2);
          break;
        default:
          expirationDate = new Date(purchaseDate);
          expirationDate.setMonth(expirationDate.getMonth() + 6);
      }

      // Check if still valid
      const now = new Date();
      if (expirationDate > now) {
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const planName = planId ? planId.charAt(0).toUpperCase() + planId.slice(1) : null;

        logger.info("Valid one-time payment found", { 
          planId, 
          planName, 
          billingPeriod, 
          expirationDate: expirationDate.toISOString(),
          daysUntilExpiration
        });

        return new Response(JSON.stringify({ 
          subscribed: true, 
          plan_name: planName,
          subscription_start: purchaseDate.toISOString(),
          subscription_end: expirationDate.toISOString(),
          payment_type: "one_time",
          billing_period: billingPeriod,
          days_until_expiration: daysUntilExpiration,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logger.info("One-time payment expired", { expirationDate: expirationDate.toISOString() });
      }
    }

    logger.info("No active subscription or valid one-time payment found");
    return new Response(JSON.stringify({ subscribed: false, plan_name: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logger.error("Error", { error: String(error) });
    return new Response(JSON.stringify({ subscribed: false, plan_name: null, error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
