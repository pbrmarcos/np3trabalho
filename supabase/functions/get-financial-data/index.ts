import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("GET-FINANCIAL-DATA");

// Safe date conversion helper
const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp)) {
    return null;
  }
  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
};

const safeDateToISO = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseClient = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;
    
    log("Admin authentication verified", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parse body for filtering
    const body = await req.json().catch(() => ({}));
    const period = body.period || "30"; // days
    const periodDays = parseInt(period);
    const startDate = Math.floor(Date.now() / 1000) - (periodDays * 24 * 60 * 60);

    log("Fetching Stripe data", { periodDays });

    // Get list of valid client emails from our database (non-admin users with client role)
    const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
    const { data: clientRoles } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    
    const clientUserIds = new Set((clientRoles || []).map(r => r.user_id));
    const validClientEmails = new Set(
      (authUsers?.users || [])
        .filter(u => clientUserIds.has(u.id))
        .map(u => u.email?.toLowerCase())
        .filter(Boolean)
    );
    
    log("Valid client emails", { count: validClientEmails.size });

    // Fetch all data in parallel
    const [subscriptions, paymentIntents, invoices, customers, charges, promotionCodes] = await Promise.all([
      stripe.subscriptions.list({ limit: 100, expand: ["data.customer"] }),
      stripe.paymentIntents.list({ limit: 100, created: { gte: startDate } }),
      stripe.invoices.list({ limit: 100, created: { gte: startDate }, expand: ["data.discount", "data.discounts"] }),
      stripe.customers.list({ limit: 100 }),
      stripe.charges.list({ limit: 100, created: { gte: startDate } }),
      stripe.promotionCodes.list({ limit: 100, active: true }),
    ]);
    
    // Create a map of payment_intent -> refund status
    const refundedPaymentIntents = new Set(
      charges.data
        .filter((c: any) => c.refunded && c.payment_intent)
        .map((c: any) => c.payment_intent)
    );
    
    // Get refunds data
    const refunds = charges.data
      .filter((c: any) => c.refunded)
      .map((c: any) => ({
        chargeId: c.id,
        paymentIntentId: c.payment_intent,
        amount: c.amount_refunded,
        currency: c.currency,
        refundedAt: c.created,
        customerEmail: c.billing_details?.email || c.receipt_email,
        description: c.description,
      }));

    log("Stripe data fetched", {
      subscriptions: subscriptions.data.length,
      paymentIntents: paymentIntents.data.length,
      invoices: invoices.data.length,
      customers: customers.data.length,
      charges: charges.data.length,
      refunds: refunds.length,
    });

    // Filter Stripe data to only include valid clients from our database
    const filteredSubscriptions = subscriptions.data.filter((s: any) => {
      const email = typeof s.customer === "object" ? s.customer?.email?.toLowerCase() : null;
      return email && validClientEmails.has(email);
    });
    
    const filteredInvoices = invoices.data.filter((i: any) => {
      const email = i.customer_email?.toLowerCase();
      return email && validClientEmails.has(email);
    });
    
    // Get customer IDs of valid clients
    const validCustomerIds = new Set(
      customers.data
        .filter((c: any) => c.email && validClientEmails.has(c.email.toLowerCase()))
        .map((c: any) => c.id)
    );
    
    const filteredPaymentIntents = paymentIntents.data.filter((p: any) => {
      return p.customer && validCustomerIds.has(p.customer);
    });
    
    log("Filtered Stripe data", {
      subscriptions: filteredSubscriptions.length,
      paymentIntents: filteredPaymentIntents.length,
      invoices: filteredInvoices.length,
    });

    // Fetch design orders from database
    const { data: designOrders, error: designError } = await supabaseClient
      .from("design_orders")
      .select(`
        id,
        client_id,
        package_id,
        status,
        payment_status,
        created_at,
        design_packages (
          name,
          price
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (designError) {
      log.error("Error fetching design orders", { error: designError.message });
    }
    log("Design orders fetched", { count: designOrders?.length || 0 });

    // Calculate statistics using filtered data
    const activeSubscriptions = filteredSubscriptions.filter((s: any) => s.status === "active");
    const successfulPayments = filteredPaymentIntents.filter((p: any) => p.status === "succeeded");
    const failedPayments = filteredPaymentIntents.filter((p: any) => p.status === "requires_payment_method" || p.status === "canceled");
    const pendingDesignOrders = (designOrders || []).filter(o => o.payment_status === "pending");
    const paidDesignOrders = (designOrders || []).filter(o => o.payment_status === "paid");

    // Calculate total revenue from paid invoices in the period (most accurate)
    const totalRevenueFromInvoices = filteredInvoices
      .filter((i: any) => i.status === "paid")
      .reduce((sum: number, i: any) => sum + (i.amount_paid || 0), 0) / 100;
    
    // Calculate design orders revenue from paid orders
    const designOrdersRevenue = paidDesignOrders.reduce((sum: number, o: any) => {
      return sum + (o.design_packages?.price || 0);
    }, 0);
    
    // Total revenue = invoices (subscriptions) + design orders
    const totalRevenue = totalRevenueFromInvoices + designOrdersRevenue;
    
    // Monthly recurring revenue from active subscriptions
    const mrr = activeSubscriptions.reduce((sum: number, s: any) => {
      const item = s.items.data[0];
      if (item?.price?.unit_amount) {
        return sum + (item.price.unit_amount / 100);
      }
      return sum;
    }, 0);

    const paymentSuccessRate = filteredPaymentIntents.length > 0 
      ? (successfulPayments.length / filteredPaymentIntents.length) * 100 
      : 100;

    // Get client emails for design orders
    const clientIds = [...new Set((designOrders || []).map(o => o.client_id))];
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name, company_name")
      .in("user_id", clientIds);
    
    const clientMap = new Map();
    clientIds.forEach(id => {
      const profile = profiles?.find(p => p.user_id === id);
      const authUser = authUsers?.users?.find(u => u.id === id);
      clientMap.set(id, {
        email: authUser?.email || "Email não encontrado",
        name: profile?.company_name || profile?.full_name || authUser?.email || "Cliente",
      });
    });

    // Enrich design orders with client info
    const enrichedDesignOrders = (designOrders || []).map(order => ({
      ...order,
      client_email: clientMap.get(order.client_id)?.email,
      client_name: clientMap.get(order.client_id)?.name,
      created_at: safeDateToISO(order.created_at),
    }));

    // Count only valid customers from our database
    const validCustomerCount = customers.data.filter((c: any) => 
      c.email && validClientEmails.has(c.email.toLowerCase())
    ).length;

    log("Building response");

    const response = {
      stats: {
        totalRevenue,
        mrr,
        activeSubscriptions: activeSubscriptions.length,
        pendingDesignOrders: pendingDesignOrders.length,
        paymentSuccessRate: Math.round(paymentSuccessRate),
        totalCustomers: validCustomerCount,
      },
      subscriptions: filteredSubscriptions.map((s: any) => ({
        id: s.id,
        status: s.status,
        customerEmail: typeof s.customer === "object" ? s.customer?.email : null,
        customerName: typeof s.customer === "object" ? s.customer?.name : null,
        planName: s.items?.data?.[0]?.price?.nickname || s.items?.data?.[0]?.price?.product || null,
        amount: s.items?.data?.[0]?.price?.unit_amount ? s.items.data[0].price.unit_amount / 100 : 0,
        currency: s.items?.data?.[0]?.price?.currency || "brl",
        interval: s.items?.data?.[0]?.price?.recurring?.interval || "month",
        currentPeriodStart: safeTimestampToISO(s.current_period_start),
        currentPeriodEnd: safeTimestampToISO(s.current_period_end),
        createdAt: safeTimestampToISO(s.created),
      })),
      paymentIntents: filteredPaymentIntents
        .filter((p: any) => !refundedPaymentIntents.has(p.id))
        .map((p: any) => ({
          id: p.id,
          amount: (p.amount || 0) / 100,
          currency: p.currency || "brl",
          status: p.status,
          description: p.description,
          customerEmail: null,
          createdAt: safeTimestampToISO(p.created),
        })),
      invoices: filteredInvoices.map((i: any) => {
        const discountAmount = i.total_discount_amounts?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0;
        const couponName = i.discount?.coupon?.name || i.discounts?.[0]?.coupon?.name || null;
        const couponCode = i.discount?.promotion_code 
          ? (typeof i.discount.promotion_code === 'object' ? i.discount.promotion_code.code : null)
          : null;
        
        return {
          id: i.id,
          number: i.number,
          amount: (i.amount_paid || 0) / 100,
          currency: i.currency || "brl",
          status: i.status,
          billingReason: i.billing_reason,
          customerEmail: i.customer_email,
          createdAt: safeTimestampToISO(i.created),
          paidAt: safeTimestampToISO(i.status_transitions?.paid_at),
          discountAmount: discountAmount / 100,
          couponName,
          couponCode,
        };
      }),
      failedPayments: failedPayments.map((p: any) => ({
        id: p.id,
        amount: (p.amount || 0) / 100,
        currency: p.currency || "brl",
        status: p.status,
        lastPaymentError: p.last_payment_error?.message || null,
        createdAt: safeTimestampToISO(p.created),
      })),
      refunds: refunds
        .filter((r: any) => {
          const email = r.customerEmail?.toLowerCase();
          return email && validClientEmails.has(email);
        })
        .map((r: any) => ({
          id: r.chargeId,
          paymentIntentId: r.paymentIntentId,
          amount: (r.amount || 0) / 100,
          currency: r.currency || "brl",
          customerEmail: r.customerEmail,
          description: r.description,
          createdAt: safeTimestampToISO(r.refundedAt),
        })),
      designOrders: enrichedDesignOrders,
    };

    log("Response prepared successfully");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
