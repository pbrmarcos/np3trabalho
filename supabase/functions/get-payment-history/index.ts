// ============================================
// GET PAYMENT HISTORY - Busca histórico de pagamentos do Stripe
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("GET-PAYMENT-HISTORY");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Usar admin client porque precisa verificar o token
    const supabaseClient = createAdminClient();

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
    
    logger.info("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logger.info("No customer found");
      return new Response(JSON.stringify({ payments: [], subscriptions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logger.info("Found customer", { customerId });

    // Get payment intents (one-time payments)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 50,
    });

    // Get checkout sessions for more details
    const checkoutSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 50,
    });

    // Get invoices (subscription payments)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Format payment history
    const payments = [];

    // Add one-time payments from checkout sessions
    for (const session of checkoutSessions.data) {
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        payments.push({
          id: session.id,
          type: 'one_time',
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || 'BRL',
          status: 'paid',
          created: new Date(session.created * 1000).toISOString(),
          description: session.metadata?.plan_name || 'Pagamento único',
          billing_period: session.metadata?.billing_period || null,
          plan_id: session.metadata?.plan_id || null,
        });
      }
    }

    // Add subscription invoices
    for (const invoice of invoices.data) {
      if (invoice.status === 'paid' && invoice.subscription) {
        payments.push({
          id: invoice.id,
          type: 'subscription',
          amount: invoice.amount_paid / 100,
          currency: invoice.currency?.toUpperCase() || 'BRL',
          status: 'paid',
          created: new Date(invoice.created * 1000).toISOString(),
          description: invoice.lines.data[0]?.description || 'Assinatura mensal',
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
        });
      }
    }

    // Sort by date descending
    payments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Format subscriptions
    const activeSubscriptions = subscriptions.data.map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      plan_name: sub.items.data[0]?.price?.nickname || 'Plano',
      amount: sub.items.data[0]?.price?.unit_amount ? sub.items.data[0].price.unit_amount / 100 : 0,
      interval: sub.items.data[0]?.price?.recurring?.interval || 'month',
    }));

    logger.info("Payment history fetched", { 
      paymentCount: payments.length, 
      subscriptionCount: activeSubscriptions.length 
    });

    return new Response(JSON.stringify({ 
      payments, 
      subscriptions: activeSubscriptions 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
