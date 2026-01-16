import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders, PRODUCTION_URL } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("SCHEDULED-EMAILS");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createAdminClient();
  const results = {
    inactivity_alerts: 0,
    subscription_reminders: 0,
    onetime_renewal_reminders: 0,
    service_suspensions: 0,
    onboarding_reminders: 0,
    errors: [] as string[],
  };

  const GRACE_PERIOD_DAYS = 7; // Days after payment failure before suspension

  // Helper function to call send-email with internal authentication
  const sendEmailInternal = async (body: any): Promise<{ ok: boolean; error?: string }> => {
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const response = await fetch(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": supabaseServiceKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { ok: false, error: errorData.error || "Unknown error" };
    }
    return { ok: true };
  };

  try {
    logger.info("Starting scheduled email processing");

    // 1. Check for inactive projects (no updates in 7+ days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: inactiveProjects, error: projectsError } = await supabase
      .from("client_projects")
      .select(`
        id,
        name,
        client_id,
        updated_at,
        status
      `)
      .lt("updated_at", sevenDaysAgo.toISOString())
      .in("status", ["development", "in_progress"])
      .limit(50);

    if (projectsError) {
      logger.error("Error fetching inactive projects", { error: projectsError.message });
      results.errors.push(`Projects: ${projectsError.message}`);
    } else if (inactiveProjects && inactiveProjects.length > 0) {
      logger.info("Found inactive projects", { count: inactiveProjects.length });

      for (const project of inactiveProjects) {
        // Check if we already sent an inactivity email in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: recentLogs } = await supabase
          .from("email_logs")
          .select("id")
          .eq("template_slug", "project_inactivity_alert")
          .contains("metadata", { project_id: project.id })
          .gte("created_at", oneDayAgo.toISOString())
          .limit(1);

        if (recentLogs && recentLogs.length > 0) {
          logger.info("Skipping project - already notified recently", { projectId: project.id });
          continue;
        }

        // Get client email
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        const clientUser = users?.find(u => u.id === project.client_id);

        if (!clientUser?.email) {
          logger.warn("Could not find client email", { clientId: project.client_id });
          continue;
        }

        // Get client profile for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", project.client_id)
          .single();

        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send inactivity alert
        const { ok, error: sendError } = await sendEmailInternal({
          template_slug: "project_inactivity_alert",
          to: [clientUser.email],
          variables: {
            client_name: profile?.full_name || "Cliente",
            project_name: project.name,
            days_inactive: daysSinceUpdate.toString(),
          },
          triggered_by: "cron",
          metadata: {
            project_id: project.id,
            days_inactive: daysSinceUpdate,
          },
        });

        if (!ok) {
          logger.error("Error sending inactivity alert", { error: sendError });
          results.errors.push(`Inactivity ${project.id}: ${sendError}`);
        } else {
          results.inactivity_alerts++;
          logger.info("Sent inactivity alert", { projectId: project.id, email: clientUser.email });
        }
      }
    }

    // 2. Check for expiring subscriptions (7 days from now) via Stripe
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      
      try {
        const sevenDaysFromNow = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000);
        const sixDaysFromNow = Math.floor((Date.now() + 6 * 24 * 60 * 60 * 1000) / 1000);

        // Get subscriptions expiring in ~7 days
        const subscriptions = await stripe.subscriptions.list({
          status: "active",
          current_period_end: {
            gte: sixDaysFromNow,
            lte: sevenDaysFromNow,
          },
          limit: 50,
        });

        logger.info("Found expiring subscriptions", { count: subscriptions.data.length });

        for (const subscription of subscriptions.data) {
          if (!subscription.customer) continue;

          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (!('email' in customer) || !customer.email) continue;

          // Check if we already sent a reminder in the last 24 hours
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);

          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", "subscription_expiring")
            .contains("metadata", { subscription_id: subscription.id })
            .gte("created_at", oneDayAgo.toISOString())
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping subscription - already notified recently", { subscriptionId: subscription.id });
            continue;
          }

          const renewalDate = new Date(subscription.current_period_end * 1000);

          // Send subscription expiring email
          const { ok, error: sendError } = await sendEmailInternal({
            template_slug: "subscription_expiring",
            to: [customer.email],
            variables: {
              customer_name: customer.name || "Cliente",
              plan_name: subscription.items.data[0]?.price?.nickname || "Plano",
              renewal_date: renewalDate.toLocaleDateString("pt-BR"),
              amount: ((subscription.items.data[0]?.price?.unit_amount || 0) / 100).toFixed(2),
            },
            triggered_by: "cron",
            metadata: {
              subscription_id: subscription.id,
              customer_id: customer.id,
            },
          });

          if (!ok) {
            logger.error("Error sending subscription reminder", { error: sendError });
            results.errors.push(`Subscription ${subscription.id}: ${sendError}`);
          } else {
            results.subscription_reminders++;
            logger.info("Sent subscription reminder", { subscriptionId: subscription.id, email: customer.email });
          }
        }
      } catch (stripeError: any) {
        logger.error("Stripe error in subscription reminders", { error: stripeError.message });
        results.errors.push(`Stripe reminders: ${stripeError.message}`);
      }

      // 3. Check for past_due subscriptions (payment failed) - SUSPENSION after grace period
      try {
        logger.info("Checking for past_due subscriptions to suspend");
        
        const pastDueSubscriptions = await stripe.subscriptions.list({
          status: "past_due",
          limit: 50,
        });

        logger.info("Found past_due subscriptions", { count: pastDueSubscriptions.data.length });

        for (const subscription of pastDueSubscriptions.data) {
          if (!subscription.customer) continue;

          // Check when the subscription became past_due (latest_invoice created date)
          let daysPastDue = 0;
          if (subscription.latest_invoice) {
            const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
            if (invoice.created) {
              daysPastDue = Math.floor((Date.now() - invoice.created * 1000) / (1000 * 60 * 60 * 24));
            }
          }

          logger.info("Subscription past_due details", { 
            subscriptionId: subscription.id, 
            daysPastDue,
            gracePeriod: GRACE_PERIOD_DAYS 
          });

          // Only suspend if past grace period
          if (daysPastDue < GRACE_PERIOD_DAYS) {
            logger.info("Skipping - still within grace period", { subscriptionId: subscription.id, daysPastDue });
            continue;
          }

          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (!('email' in customer) || !customer.email) continue;

          // Check if we already sent a suspension email for this subscription
          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", "service_suspended")
            .contains("metadata", { subscription_id: subscription.id })
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping - suspension email already sent", { subscriptionId: subscription.id });
            continue;
          }

          // Find user by email and get their projects
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const clientUser = users?.find(u => u.email === customer.email);

          if (clientUser) {
            // Update all client projects to suspended
            const { error: updateError } = await supabase
              .from("client_projects")
              .update({ status: "suspended" })
              .eq("client_id", clientUser.id)
              .neq("status", "suspended");

            if (updateError) {
              logger.error("Error updating project status", { error: updateError.message });
            } else {
              logger.info("Projects suspended for client", { clientId: clientUser.id });
            }
          }

          // Get profile for name
          const { data: profile } = clientUser ? await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", clientUser.id)
            .single() : { data: null };

          // Send service_suspended email
          const { ok, error: sendError } = await sendEmailInternal({
            template_slug: "service_suspended",
            to: [customer.email],
            variables: {
              customer_name: customer.name || profile?.full_name || "Cliente",
              days_overdue: daysPastDue.toString(),
              plan_name: subscription.items.data[0]?.price?.nickname || "Plano",
            },
            triggered_by: "cron",
            metadata: {
              subscription_id: subscription.id,
              customer_id: customer.id,
              days_overdue: daysPastDue,
            },
          });

          if (!ok) {
            logger.error("Error sending suspension email", { error: sendError });
            results.errors.push(`Suspension ${subscription.id}: ${sendError}`);
          } else {
            results.service_suspensions++;
            logger.info("Sent suspension email and suspended projects", { 
              subscriptionId: subscription.id, 
              email: customer.email,
              daysPastDue 
            });
          }
        }
      } catch (stripeError: any) {
        logger.error("Stripe error in suspension check", { error: stripeError.message });
        results.errors.push(`Stripe suspension: ${stripeError.message}`);
      }

      // 4. Check for one-time payment plans nearing expiration (30 days from now)
      try {
        logger.info("Checking for one-time payment plans nearing expiration");
        
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const twentyNineDaysFromNow = new Date();
        twentyNineDaysFromNow.setDate(twentyNineDaysFromNow.getDate() + 29);

        // Get completed checkout sessions from last 2 years that are one-time payments
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
          expand: ['data.line_items'],
        });

        const oneTimePayments = sessions.data.filter((session: Stripe.Checkout.Session) => 
          session.mode === 'payment' && 
          session.payment_status === 'paid' &&
          session.metadata?.billing_period &&
          session.metadata?.billing_period !== 'monthly'
        );

        logger.info("Found one-time payment sessions", { count: oneTimePayments.length });

        for (const session of oneTimePayments) {
          if (!session.customer_email) continue;

          const billingPeriod = session.metadata?.billing_period;
          const purchaseDate = new Date(session.created * 1000);
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
              continue;
          }

          // Check if expiration is within 29-30 days OR 6-7 days from now
          const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          const is30DayReminder = daysUntilExpiration >= 29 && daysUntilExpiration <= 30;
          const is7DayReminder = daysUntilExpiration >= 6 && daysUntilExpiration <= 7;
          
          if (!is30DayReminder && !is7DayReminder) {
            continue;
          }
          
          const templateSlug = is7DayReminder ? "onetime_plan_expiring_7days" : "onetime_plan_expiring";

          logger.info("Found expiring one-time plan", { 
            sessionId: session.id, 
            email: session.customer_email,
            daysUntilExpiration,
            billingPeriod,
            reminderType: is7DayReminder ? "7-day" : "30-day"
          });

          // Check if we already sent this specific reminder for this session
          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", templateSlug)
            .contains("metadata", { session_id: session.id })
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping - already notified with this template", { sessionId: session.id, template: templateSlug });
            continue;
          }

          // Get customer info
          let customerName = "Cliente";
          if (session.customer) {
            const customer = await stripe.customers.retrieve(session.customer as string);
            if ('name' in customer && customer.name) {
              customerName = customer.name;
            }
          }

          // Get plan name from metadata
          const planId = session.metadata?.plan_id || 'plano';
          const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

          // Send renewal reminder email
          const { ok, error: sendError } = await sendEmailInternal({
            template_slug: templateSlug,
            to: [session.customer_email],
            variables: {
              client_name: customerName,
              plan_name: planName,
              expiration_date: expirationDate.toLocaleDateString("pt-BR"),
              days_remaining: daysUntilExpiration.toString(),
              renewal_url: `${PRODUCTION_URL}/planos`,
            },
            triggered_by: "cron",
            metadata: {
              session_id: session.id,
              billing_period: billingPeriod,
              days_until_expiration: daysUntilExpiration,
              reminder_type: is7DayReminder ? "7-day" : "30-day",
            },
          });

          if (!ok) {
            logger.error("Error sending one-time renewal reminder", { error: sendError });
            results.errors.push(`OneTime ${session.id}: ${sendError}`);
          } else {
            results.onetime_renewal_reminders++;
            logger.info("Sent one-time renewal reminder", { sessionId: session.id, email: session.customer_email });
          }
        }

        // 5. Check for EXPIRED one-time payment plans and suspend
        logger.info("Checking for expired one-time payment plans to suspend");

        for (const session of oneTimePayments) {
          if (!session.customer_email) continue;

          const billingPeriod = session.metadata?.billing_period;
          const purchaseDate = new Date(session.created * 1000);
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
              continue;
          }

          // Check if plan has expired
          if (expirationDate > new Date()) {
            continue; // Not expired yet
          }

          const daysExpired = Math.floor((Date.now() - expirationDate.getTime()) / (1000 * 60 * 60 * 24));

          logger.info("Found expired one-time plan", { 
            sessionId: session.id, 
            email: session.customer_email,
            daysExpired,
            billingPeriod
          });

          // Check if we already sent a suspension email for this session
          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", "onetime_service_suspended")
            .contains("metadata", { session_id: session.id })
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping - suspension email already sent", { sessionId: session.id });
            continue;
          }

          // Find user by email and suspend their projects
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const clientUser = users?.find(u => u.email === session.customer_email);

          if (clientUser) {
            // Update all client projects to suspended
            const { error: updateError } = await supabase
              .from("client_projects")
              .update({ status: "suspended" })
              .eq("client_id", clientUser.id)
              .neq("status", "suspended");

            if (updateError) {
              logger.error("Error updating project status", { error: updateError.message });
            } else {
              logger.info("Projects suspended for client", { clientId: clientUser.id });
            }
          }

          // Get customer info
          let customerName = "Cliente";
          if (session.customer) {
            const customer = await stripe.customers.retrieve(session.customer as string);
            if ('name' in customer && customer.name) {
              customerName = customer.name;
            }
          }

          // Get plan name from metadata
          const planId = session.metadata?.plan_id || 'plano';
          const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

          // Send service_suspended email for one-time plans
          const { ok, error: sendError } = await sendEmailInternal({
            template_slug: "onetime_service_suspended",
            to: [session.customer_email],
            variables: {
              client_name: customerName,
              plan_name: planName,
              expiration_date: expirationDate.toLocaleDateString("pt-BR"),
              days_expired: daysExpired.toString(),
              renewal_url: `${PRODUCTION_URL}/planos`,
            },
            triggered_by: "cron",
            metadata: {
              session_id: session.id,
              billing_period: billingPeriod,
              days_expired: daysExpired,
            },
          });

          if (!ok) {
            logger.error("Error sending one-time suspension email", { error: sendError });
            results.errors.push(`OneTime suspension ${session.id}: ${sendError}`);
          } else {
            results.service_suspensions++;
            logger.info("Sent one-time suspension email and suspended projects", { 
              sessionId: session.id, 
              email: session.customer_email,
              daysExpired 
            });
          }
        }
      } catch (stripeError: any) {
        logger.error("Stripe error in one-time renewal/suspension check", { error: stripeError.message });
        results.errors.push(`OneTime renewal: ${stripeError.message}`);
      }
    } else {
      logger.warn("STRIPE_SECRET_KEY not configured, skipping subscription checks");
    }

    // 6. Check for pending onboarding after 24 hours
    try {
      logger.info("Checking for pending onboarding reminders");
      
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      // Get onboardings that are pending and created between 24-48 hours ago
      const { data: pendingOnboardings, error: onboardingError } = await supabase
        .from("client_onboarding")
        .select("id, user_id, company_name, selected_plan, created_at")
        .eq("onboarding_status", "pending")
        .lt("created_at", twentyFourHoursAgo.toISOString())
        .gt("created_at", fortyEightHoursAgo.toISOString())
        .limit(50);

      if (onboardingError) {
        logger.error("Error fetching pending onboardings", { error: onboardingError.message });
        results.errors.push(`Onboarding: ${onboardingError.message}`);
      } else if (pendingOnboardings && pendingOnboardings.length > 0) {
        logger.info("Found pending onboardings", { count: pendingOnboardings.length });

        for (const onboarding of pendingOnboardings) {
          // Check if we already sent a reminder in the last 24 hours
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);

          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", "onboarding_reminder")
            .contains("metadata", { onboarding_id: onboarding.id })
            .gte("created_at", oneDayAgo.toISOString())
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping onboarding - already notified recently", { onboardingId: onboarding.id });
            continue;
          }

          // Get user email
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const clientUser = users?.find(u => u.id === onboarding.user_id);

          if (!clientUser?.email) {
            logger.warn("Could not find client email for onboarding", { userId: onboarding.user_id });
            continue;
          }

          // Get profile for name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", onboarding.user_id)
            .single();

          // Send onboarding reminder email
          const { ok, error: sendError } = await sendEmailInternal({
            template_slug: "onboarding_reminder",
            to: [clientUser.email],
            variables: {
              client_name: profile?.full_name || onboarding.company_name || "Cliente",
              plan_name: onboarding.selected_plan 
                ? `Plano ${onboarding.selected_plan.charAt(0).toUpperCase() + onboarding.selected_plan.slice(1)}`
                : "seu plano",
              onboarding_url: "https://webq.com.br/cliente/onboarding",
            },
            triggered_by: "cron",
            metadata: {
              onboarding_id: onboarding.id,
              user_id: onboarding.user_id,
            },
          });

          if (!ok) {
            logger.error("Error sending onboarding reminder", { error: sendError });
            results.errors.push(`Onboarding ${onboarding.id}: ${sendError}`);
          } else {
            results.onboarding_reminders++;
            logger.info("Sent onboarding reminder", { onboardingId: onboarding.id, email: clientUser.email });
          }
        }
      }
    } catch (onboardingError: any) {
      logger.error("Error in onboarding reminders", { error: onboardingError.message });
      results.errors.push(`Onboarding reminders: ${onboardingError.message}`);
    }

    logger.info("Scheduled email processing complete", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logger.error("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message, results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
