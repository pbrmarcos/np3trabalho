// ============================================
// CONFIRM DESIGN ORDER - Confirma pedido de design após pagamento
// ============================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyJWT } from "../_shared/auth.ts";
import { createAnonClient, createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("CONFIRM-DESIGN-ORDER");

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

    // Verificar autenticação
    const authResult = await verifyJWT(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    if (!user.email) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logger.info("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const { order_id } = body;
    
    if (!order_id) {
      throw new Error("Order ID is required");
    }

    logger.info("Confirming order", { order_id });

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("design_orders")
      .select(`
        *,
        package:design_packages(name, price, category:design_service_categories(name))
      `)
      .eq("id", order_id)
      .eq("client_id", user.id)
      .single();

    if (orderError || !order) {
      logger.warn("Order not found", { error: orderError?.message });
      throw new Error("Order not found");
    }

    // If already confirmed, just return success
    if (order.payment_status === "paid") {
      logger.info("Order already confirmed", { order_id });
      return new Response(JSON.stringify({ success: true, already_confirmed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify payment in Stripe
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      
      if (session.payment_status !== "paid") {
        logger.warn("Payment not completed", { payment_status: session.payment_status });
        throw new Error("Payment not completed");
      }
      
      logger.info("Stripe payment verified", { payment_status: session.payment_status });
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from("design_orders")
      .update({
        status: "pending",
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateError) {
      logger.error("Failed to update order", { error: updateError.message });
      throw new Error("Failed to confirm order");
    }

    logger.info("Order status updated to pending/paid");

    // Get client profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", user.id)
      .single();

    const clientName = profile?.full_name || profile?.company_name || "Cliente";
    const packageName = order.package?.name || "Design";
    const categoryName = order.package?.category?.name || "Design Digital";

    // Send confirmation email to client (design_order_paid template)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const clientUrl = `https://webq.com.br/cliente/design/${order_id}`;
    
    try {
      await fetch(sendEmailUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": supabaseServiceKey,
        },
        body: JSON.stringify({
          template_slug: "design_order_paid",
          to: [user.email],
          variables: {
            client_name: clientName,
            package_name: packageName,
            category_name: categoryName,
            order_id: order_id.substring(0, 8),
            client_url: clientUrl,
          },
          triggered_by: "system",
        }),
      });
      logger.info("Confirmation email sent to client");
    } catch (emailError) {
      logger.warn("Failed to send client email", { error: emailError });
    }

    // Notify all admins
    const { data: adminIds } = await supabaseAdmin.rpc('get_admin_user_ids');
    if (adminIds && adminIds.length > 0) {
      // Create notifications for admins
      for (const adminId of adminIds) {
        await supabaseAdmin.from("notifications").insert({
          user_id: adminId,
          type: "design_order",
          title: "Novo pedido de design",
          message: `${clientName} solicitou ${packageName}`,
          reference_id: order_id,
          reference_type: "design_order",
        });
      }
      logger.info("Admin notifications created", { count: adminIds.length });

      // Send email to admins
      try {
        await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": supabaseServiceKey,
          },
          body: JSON.stringify({
            template_slug: "design_order_created",
            to: adminIds,
            variables: {
              client_name: clientName,
              package_name: packageName,
              category_name: categoryName,
              order_id: order_id.substring(0, 8),
              admin_url: `https://webq.com.br/admin/design/${order_id}`,
            },
            triggered_by: "system",
          }),
        });
        logger.info("Admin notification emails sent");
      } catch (emailError) {
        logger.warn("Failed to send admin email", { error: emailError });
      }
    }

    // Add timeline entry
    const { data: projects } = await supabaseAdmin
      .from("client_projects")
      .select("id")
      .eq("client_id", user.id)
      .limit(1);

    if (projects && projects.length > 0) {
      const { data: adminId } = await supabaseAdmin.rpc('get_admin_user_ids');
      if (adminId && adminId.length > 0) {
        await supabaseAdmin.from("timeline_messages").insert({
          client_id: user.id,
          admin_id: adminId[0],
          project_id: projects[0].id,
          message: `Novo pedido de design: ${packageName}`,
          message_type: "info",
        });
        logger.info("Timeline entry created");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
