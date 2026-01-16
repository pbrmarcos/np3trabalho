import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Stripe webhook needs stripe-signature header
const getWebhookCorsHeaders = (origin: string | null) => {
  const baseHeaders = getCorsHeaders(origin);
  return {
    ...baseHeaders,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  };
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Retry function with exponential backoff for database operations
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500,
  operationName = "operation"
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const delay = baseDelay * Math.pow(2, attempt);
      logStep(`${operationName} failed (attempt ${attempt + 1}/${maxRetries})`, { 
        error: error.message, 
        nextRetryIn: attempt < maxRetries - 1 ? `${delay}ms` : "no more retries" 
      });
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

// Helper to execute Supabase operation with retry on transient errors
async function dbOperation<T>(
  supabase: any,
  operation: () => Promise<{ data: T | null; error: any }>,
  operationName: string
): Promise<{ data: T | null; error: any }> {
  return withRetry(async () => {
    const result = await operation();
    if (result.error && isTransientError(result.error)) {
      throw new Error(result.error.message);
    }
    return result;
  }, 3, 500, operationName);
}

// Check if error is transient (network, timeout, etc.)
function isTransientError(error: any): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('temporarily') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getWebhookCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Stripe key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    let event: Stripe.Event;

    // SECURITY: Always require webhook secret - no fallback
    if (!webhookSecret) {
      logStep("CRITICAL ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature - REQUIRED
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      logStep("ERROR: Invalid signature", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // IDEMPOTENCY CHECK: Prevent duplicate processing
    const { data: existingEvent, error: checkError } = await supabase
      .from("processed_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (checkError) {
      logStep("WARNING: Failed to check idempotency", { error: checkError.message });
      // Continue processing - better to risk duplicate than fail completely
    } else if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, processed: false, reason: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record event as being processed (before processing to handle crashes)
    const { error: insertError } = await supabase
      .from("processed_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
      });

    if (insertError) {
      // If duplicate key error, event was already processed (race condition)
      if (insertError.code === "23505") {
        logStep("Event already processed (race condition), skipping", { eventId: event.id });
        return new Response(JSON.stringify({ received: true, processed: false, reason: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      logStep("WARNING: Failed to record event", { error: insertError.message });
    }

    // Handle checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Handle brand creation from onboarding (add_brand_creation = true)
      if (session.metadata?.add_brand_creation === "true" && session.metadata?.onboarding_id) {
        const userId = session.metadata.user_id;
        const onboardingId = session.metadata.onboarding_id;
        
        logStep("Processing brand creation from onboarding", { userId, onboardingId });
        
        // Get onboarding data to copy brand-specific fields
        const { data: onboarding, error: fetchOnboardingError } = await supabase
          .from("client_onboarding")
          .select("preferred_color, logo_description, inspiration_urls, company_name")
          .eq("id", onboardingId)
          .single();
        
        if (fetchOnboardingError) {
          logStep("ERROR: Failed to fetch onboarding data", { error: fetchOnboardingError.message });
        }
        
        // CRITICAL: Mark brand_creation_paid = true in onboarding
        const { error: updateOnboardingError } = await supabase
          .from("client_onboarding")
          .update({ 
            brand_creation_paid: true,
            brand_status: "in_progress"
          })
          .eq("id", onboardingId);
        
        if (updateOnboardingError) {
          logStep("ERROR: Failed to update brand_creation_paid", { error: updateOnboardingError.message });
        } else {
          logStep("Successfully marked brand_creation_paid = true");
        }
        
        // Create design order for brand creation with onboarding data
        const { data: order, error: orderError } = await supabase
          .from("design_orders")
          .insert({
            client_id: userId,
            package_id: "pkg-brand-creation",
            project_id: null,
            notes: `Criação de Marca para ${onboarding?.company_name || "empresa"}`,
            status: "pending",
            payment_status: "paid",
            stripe_session_id: session.id,
            max_revisions: 2,
            revisions_used: 0,
            // Copy brand-specific fields from onboarding
            preferred_color: onboarding?.preferred_color || null,
            logo_description: onboarding?.logo_description || null,
            inspiration_urls: onboarding?.inspiration_urls || null,
          })
          .select()
          .single();

        if (orderError) {
          logStep("ERROR: Failed to create brand design order", { error: orderError.message });
        } else {
          logStep("Brand design order created successfully", { orderId: order.id });
          
          // Send confirmation email to client
          const customerEmail = session.customer_details?.email || session.customer_email;
          if (customerEmail) {
            const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
            await fetch(sendEmailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": supabaseServiceKey,
              },
              body: JSON.stringify({
                template_slug: "design_order_created",
                to: [customerEmail],
                variables: {
                  client_name: session.customer_details?.name || "Cliente",
                  package_name: "Criação de Marca",
                  category_name: "Criação de Marca",
                  order_id: order.id.substring(0, 8),
                  client_url: `https://webq.com.br/cliente/design/${order.id}`,
                },
                triggered_by: "webhook",
                metadata: {
                  stripe_event_id: event.id,
                  stripe_event_type: event.type,
                },
              }),
            });
            logStep("Brand design order confirmation email sent");
          }
          
          // Notify all admins
          const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
          if (adminIds && adminIds.length > 0) {
            for (const adminId of adminIds) {
              await supabase.from("notifications").insert({
                user_id: adminId,
                type: "design_order",
                title: "Novo pedido de Criação de Marca",
                message: `${session.customer_details?.name || "Cliente"} contratou Criação de Marca no onboarding`,
                reference_id: order.id,
                reference_type: "design_order",
              });
            }
          }
        }
      }
      
      // Update the selected_plan in onboarding to match what was actually paid
      if (session.metadata?.onboarding_id && session.metadata?.plan_id) {
        const planId = session.metadata.plan_id;
        logStep("Updating onboarding selected_plan to match paid plan", { planId });
        
        const { error: updatePlanError } = await supabase
          .from("client_onboarding")
          .update({ selected_plan: planId })
          .eq("id", session.metadata.onboarding_id);
        
        if (updatePlanError) {
          logStep("ERROR: Failed to update selected_plan", { error: updatePlanError.message });
        } else {
          logStep("Successfully updated selected_plan to", { planId });
        }
      }
      
      // Handle design order payment
      if (session.metadata?.package_type === "design_order") {
        const orderId = session.metadata.order_id;
        const userId = session.metadata.user_id;

        logStep("Processing design order payment", { orderId, userId });

        // Update the existing order to mark as paid and pending briefing
        const { data: order, error: updateError } = await supabase
          .from("design_orders")
          .update({
            payment_status: "paid",
            status: "pending_briefing",
            stripe_session_id: session.id,
          })
          .eq("id", orderId)
          .eq("client_id", userId)
          .select(`
            *,
            design_packages(name, design_service_categories(name))
          `)
          .single();

        if (updateError) {
          logStep("ERROR: Failed to update design order", { error: updateError.message });
        } else {
          logStep("Design order updated successfully", { orderId: order.id, status: "pending_briefing" });

          // Get package and category names
          const packageData = order.design_packages as any;
          const packageName = packageData?.name || "Design";
          const categoryData = packageData?.design_service_categories as any;
          const categoryName = Array.isArray(categoryData) 
            ? (categoryData[0]?.name || "Design Digital")
            : (categoryData?.name || "Design Digital");

          // Send confirmation email to client
          const customerEmail = session.customer_details?.email || session.customer_email;
          if (customerEmail) {
            const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
            await fetch(sendEmailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": supabaseServiceKey,
              },
              body: JSON.stringify({
                template_slug: "design_order_paid",
                to: [customerEmail],
                variables: {
                  client_name: session.customer_details?.name || "Cliente",
                  package_name: packageName,
                  category_name: categoryName,
                  order_id: order.id.substring(0, 8),
                  briefing_url: `https://webq.com.br/cliente/design/briefing?order=${order.id}`,
                },
                triggered_by: "webhook",
                metadata: {
                  stripe_event_id: event.id,
                  stripe_event_type: event.type,
                },
              }),
            });
            logStep("Design order confirmation email sent to client");
          }

          // Notify all admins about new paid order
          const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
          if (adminIds && adminIds.length > 0) {
            for (const adminId of adminIds) {
              await supabase.from("notifications").insert({
                user_id: adminId,
                type: "design_order",
                title: "Novo pedido de design pago",
                message: `${session.customer_details?.name || "Cliente"} pagou ${packageName} - aguardando briefing`,
                reference_id: order.id,
                reference_type: "design_order",
              });
            }
          }
        }

        return new Response(JSON.stringify({ received: true, processed: true, type: "design_order" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Handle brand additional package
      if (session.metadata?.package_type === "brand_additional") {
        const onboardingId = session.metadata.onboarding_id;
        logStep("Processing brand additional package purchase", { onboardingId });
        
        // Get current package number and increment
        const { data: onboarding, error: fetchError } = await supabase
          .from("client_onboarding")
          .select("brand_current_package, user_id, company_name")
          .eq("id", onboardingId)
          .single();
        
        if (fetchError) {
          logStep("ERROR: Failed to fetch onboarding", { error: fetchError.message });
        } else {
          const newPackageNumber = (onboarding.brand_current_package || 1) + 1;
          
          // Reset counters and increment package
          const { error: updateError } = await supabase
            .from("client_onboarding")
            .update({
              brand_current_package: newPackageNumber,
              brand_versions_used: 0,
              brand_revisions_used: 0,
              brand_status: "in_progress"
            })
            .eq("id", onboardingId);
          
          if (updateError) {
            logStep("ERROR: Failed to update onboarding", { error: updateError.message });
          } else {
            logStep("Brand package counters reset successfully", { newPackageNumber });
            
            // Send confirmation email
            const customerEmail = session.customer_details?.email || session.customer_email;
            if (customerEmail) {
              const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
              await fetch(sendEmailUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Internal-Key": supabaseServiceKey,
                },
                body: JSON.stringify({
                  template_slug: "brand_package_purchased",
                  to: [customerEmail],
                  variables: {
                    client_name: session.customer_details?.name || "Cliente",
                    company_name: onboarding.company_name || "Sua Empresa",
                    dashboard_url: "https://webq.com.br/cliente/marca",
                  },
                  triggered_by: "webhook",
                  metadata: {
                    stripe_event_id: event.id,
                    stripe_event_type: event.type,
                  },
                }),
              });
              logStep("Brand package purchase confirmation email sent");
            }
          }
        }
        
        return new Response(JSON.stringify({ received: true, processed: true, type: "brand_package" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle one-time hosting plan payments (semester, annual, biennial)
      if (session.metadata?.plan_id && session.metadata?.billing_period && session.metadata?.billing_period !== "monthly") {
        const planId = session.metadata.plan_id;
        const billingPeriod = session.metadata.billing_period;
        const userId = session.metadata.user_id;
        const onboardingId = session.metadata.onboarding_id;
        const addBrandCreation = session.metadata.add_brand_creation === "true";
        
        logStep("Processing one-time hosting plan payment", { planId, billingPeriod, userId, onboardingId, addBrandCreation });
        
        // Create or update minimal onboarding record with pending status
        if (onboardingId) {
          // Update existing onboarding to mark payment complete, keep status pending for post-payment form
          const { error: updateOnboardingError } = await supabase
            .from("client_onboarding")
            .update({ 
              stripe_session_id: session.id,
              selected_plan: planId,
              // Status stays "pending" until client completes post-payment onboarding
            })
            .eq("id", onboardingId);
          
          if (updateOnboardingError) {
            logStep("ERROR: Failed to update onboarding", { error: updateOnboardingError.message });
          } else {
            logStep("Onboarding updated with payment info, status remains pending for post-payment form");
          }
        } else {
          // No onboarding exists, create minimal record
          const { data: newOnboarding, error: createOnboardingError } = await supabase
            .from("client_onboarding")
            .insert({
              user_id: userId,
              selected_plan: planId,
              whatsapp: "", // Will be filled in post-payment onboarding
              company_name: session.customer_details?.name || "Minha Empresa",
              business_type: "Outro",
              onboarding_status: "pending",
              stripe_session_id: session.id,
              needs_brand_creation: addBrandCreation,
              brand_creation_paid: addBrandCreation,
            })
            .select()
            .single();
          
          if (createOnboardingError) {
            logStep("ERROR: Failed to create minimal onboarding", { error: createOnboardingError.message });
          } else {
            logStep("Minimal onboarding created with pending status", { onboardingId: newOnboarding.id });
          }
        }
        
        // Calculate subscription end date based on billing period
        const periodMonths: Record<string, number> = {
          semester: 6,
          annual: 12,
          biennial: 24,
        };
        const months = periodMonths[billingPeriod] || 12;
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + months);
        
        // Update user_subscriptions for one-time payment
        if (userId) {
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + months);
          
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string || null,
              stripe_subscription_id: null,
              status: "active",
              plan_id: planId,
              billing_type: "one_time",
              one_time_expiry: expiryDate.toISOString(),
              current_period_end: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          
          if (subError) {
            logStep("ERROR: Failed to update user_subscriptions for one-time payment", { error: subError.message });
          } else {
            logStep("user_subscriptions updated for one-time payment", { userId, planId, expiry: expiryDate.toISOString() });
          }
        }
        
        // Send welcome email with link to complete onboarding
        const customerEmail = session.customer_details?.email || session.customer_email;
        if (customerEmail) {
          const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
          await fetch(sendEmailUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": supabaseServiceKey,
            },
            body: JSON.stringify({
              template_slug: "welcome_client",
              to: [customerEmail],
              variables: {
                client_name: session.customer_details?.name || "Cliente",
                plan_name: `Plano ${planId.charAt(0).toUpperCase() + planId.slice(1)} (${billingPeriod === "semester" ? "Semestral" : billingPeriod === "annual" ? "Anual" : "Bienal"})`,
                dashboard_url: "https://webq.com.br/cliente/onboarding",
              },
              triggered_by: "webhook",
              metadata: {
                stripe_event_id: event.id,
                stripe_event_type: event.type,
                payment_type: "one_time",
                billing_period: billingPeriod,
              },
            }),
          });
          logStep("Welcome email sent for one-time payment with onboarding link");
        }
        
        // Notify admins
        const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
        if (adminIds && adminIds.length > 0) {
          for (const adminId of adminIds) {
            await supabase.from("notifications").insert({
              user_id: adminId,
              type: "new_client",
              title: "Novo cliente - Pagamento Único",
              message: `Novo cliente contratou o plano ${planId} (${billingPeriod}) - aguardando onboarding`,
              reference_type: "onboarding",
            });
          }
          logStep("Admin notifications created for one-time payment");
        }
        
        return new Response(JSON.stringify({ received: true, processed: true, type: "hosting_one_time" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Handle monthly subscription checkout (mode: subscription)
      if (session.mode === "subscription" && session.subscription) {
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const onboardingId = session.metadata?.onboarding_id;
        const addBrandCreation = session.metadata?.add_brand_creation === "true";
        
        if (userId) {
          // Fetch subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string || null,
              stripe_subscription_id: subscription.id,
              status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
              plan_id: planId || null,
              billing_type: "recurring",
              one_time_expiry: null,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          
          if (subError) {
            logStep("ERROR: Failed to update user_subscriptions for subscription", { error: subError.message });
          } else {
            logStep("user_subscriptions updated for subscription", { userId, subscriptionId: subscription.id });
          }
          
          // Create or update minimal onboarding record with pending status for monthly subscriptions
          if (onboardingId) {
            const { error: updateOnboardingError } = await supabase
              .from("client_onboarding")
              .update({ 
                stripe_session_id: session.id,
                selected_plan: planId,
              })
              .eq("id", onboardingId);
            
            if (updateOnboardingError) {
              logStep("ERROR: Failed to update onboarding for subscription", { error: updateOnboardingError.message });
            } else {
              logStep("Onboarding updated for subscription, status remains pending");
            }
          } else {
            // Create minimal onboarding for monthly subscription
            const { data: newOnboarding, error: createOnboardingError } = await supabase
              .from("client_onboarding")
              .insert({
                user_id: userId,
                selected_plan: planId || "essencial",
                whatsapp: "",
                company_name: session.customer_details?.name || "Minha Empresa",
                business_type: "Outro",
                onboarding_status: "pending",
                stripe_session_id: session.id,
                needs_brand_creation: addBrandCreation,
                brand_creation_paid: addBrandCreation,
              })
              .select()
              .single();
            
            if (createOnboardingError) {
              logStep("ERROR: Failed to create minimal onboarding for subscription", { error: createOnboardingError.message });
            } else {
              logStep("Minimal onboarding created for subscription", { onboardingId: newOnboarding.id });
            }
          }
          
          // Send welcome email with link to complete onboarding
          const customerEmail = session.customer_details?.email || session.customer_email;
          if (customerEmail) {
            const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
            await fetch(sendEmailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": supabaseServiceKey,
              },
              body: JSON.stringify({
                template_slug: "welcome_client",
                to: [customerEmail],
                variables: {
                  client_name: session.customer_details?.name || "Cliente",
                  plan_name: `Plano ${(planId || "essencial").charAt(0).toUpperCase() + (planId || "essencial").slice(1)} (Mensal)`,
                  dashboard_url: "https://webq.com.br/cliente/onboarding",
                },
                triggered_by: "webhook",
                metadata: {
                  stripe_event_id: event.id,
                  stripe_event_type: event.type,
                  payment_type: "subscription",
                },
              }),
            });
            logStep("Welcome email sent for subscription with onboarding link");
          }
          
          // Notify admins
          const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
          if (adminIds && adminIds.length > 0) {
            for (const adminId of adminIds) {
              await supabase.from("notifications").insert({
                user_id: adminId,
                type: "new_client",
                title: "Novo cliente - Assinatura Mensal",
                message: `Novo cliente assinou o plano ${planId || "essencial"} - aguardando onboarding`,
                reference_type: "onboarding",
              });
            }
            logStep("Admin notifications created for subscription");
          }
        }
      }
    }
    
    // Handle subscription updates
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Find user by stripe_customer_id
      const { data: userSub } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      
      if (userSub) {
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userSub.user_id);
        
        if (updateError) {
          logStep("ERROR: Failed to update subscription status", { error: updateError.message });
        } else {
          logStep("Subscription status updated", { userId: userSub.user_id, status: subscription.status });
        }
      }
    }
    
    // Handle subscription deletion
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Find user and mark subscription as cancelled
      const { data: userSub } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      
      if (userSub) {
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userSub.user_id);
        
        if (updateError) {
          logStep("ERROR: Failed to mark subscription as cancelled", { error: updateError.message });
        } else {
          logStep("Subscription marked as cancelled", { userId: userSub.user_id });
        }
      }
    }

    // Map Stripe events to email templates
    const eventTemplateMap: Record<string, string> = {
      "invoice.payment_succeeded": "payment_success",
      "invoice.payment_failed": "payment_failed",
      "customer.subscription.deleted": "subscription_cancelled",
      "invoice.upcoming": "subscription_expiring",
      "checkout.session.completed": "welcome_client",
    };

    const templateSlug = eventTemplateMap[event.type];
    
    if (!templateSlug) {
      logStep("Event type not mapped to any template, ignoring", { type: event.type });
      return new Response(JSON.stringify({ received: true, processed: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract customer email based on event type
    let customerEmail: string | null = null;
    let variables: Record<string, string> = {};

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        customerEmail = invoice.customer_email;
        
        if (!customerEmail && invoice.customer) {
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          if ('email' in customer && customer.email) {
            customerEmail = customer.email;
          }
        }

        const planName = invoice.lines?.data?.[0]?.description || "Plano WebQ";
        variables = {
          client_name: invoice.customer_name || "Cliente",
          plan_name: planName,
          amount: (invoice.amount_due / 100).toFixed(2),
          payment_date: new Date().toLocaleDateString("pt-BR"),
          dashboard_url: "https://webq.com.br/cliente/dashboard",
        };
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        customerEmail = invoice.customer_email;
        
        if (!customerEmail && invoice.customer) {
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          if ('email' in customer && customer.email) {
            customerEmail = customer.email;
          }
        }

        const planName = invoice.lines?.data?.[0]?.description || "Plano WebQ";
        variables = {
          client_name: invoice.customer_name || "Cliente",
          plan_name: planName,
          failure_reason: "Cartão recusado ou limite insuficiente",
          payment_url: "https://webq.com.br/cliente/assinatura",
        };
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        customerEmail = invoice.customer_email;
        
        if (!customerEmail && invoice.customer) {
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          if ('email' in customer && customer.email) {
            customerEmail = customer.email;
          }
        }

        const planName = invoice.lines?.data?.[0]?.description || "Plano WebQ";
        variables = {
          client_name: invoice.customer_name || "Cliente",
          plan_name: planName,
          renewal_date: invoice.due_date 
            ? new Date(invoice.due_date * 1000).toLocaleDateString("pt-BR")
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
          amount: (invoice.amount_due / 100).toFixed(2),
          manage_subscription_url: "https://webq.com.br/cliente/assinatura",
        };
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        if (subscription.customer) {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if ('email' in customer && customer.email) {
            customerEmail = customer.email;
            const accessUntilDate = new Date(subscription.current_period_end * 1000).toLocaleDateString("pt-BR");
            variables = {
              client_name: customer.name || "Cliente",
              plan_name: subscription.items.data[0]?.price?.nickname || "Plano WebQ",
              project_name: "Seu Projeto",
              access_until_date: accessUntilDate,
              reactivate_url: "https://webq.com.br/cliente/assinatura",
              feedback_url: "https://webq.com.br/cliente/dashboard",
            };
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        customerEmail = session.customer_details?.email || session.customer_email || null;
        
        variables = {
          client_name: session.customer_details?.name || "Cliente",
          plan_name: session.metadata?.plan_name || "Plano WebQ",
          dashboard_url: "https://webq.com.br/cliente/dashboard",
        };
        break;
      }
    }

    if (!customerEmail) {
      logStep("Could not determine customer email, skipping", { eventType: event.type });
      return new Response(JSON.stringify({ received: true, processed: false, reason: "No customer email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Sending email", { template: templateSlug, to: customerEmail });

    // Call send-email function with internal key for authentication
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const emailResponse = await fetch(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": supabaseServiceKey,
      },
      body: JSON.stringify({
        template_slug: templateSlug,
        to: [customerEmail],
        variables,
        triggered_by: "webhook",
        metadata: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      logStep("ERROR: Failed to send email", { error: errorData });
    } else {
      logStep("Email sent successfully");
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});