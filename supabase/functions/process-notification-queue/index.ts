import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("NOTIFICATION-QUEUE");

// Deduplication window in minutes
const DEDUP_WINDOW_MINUTES = 5;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createAdminClient();

  const results = {
    processed: 0,
    sent: 0,
    skipped_duplicate: 0,
    failed: 0,
    errors: [] as string[],
    consecutive_failures: 0,
  };

  // Check for consecutive failures alert threshold
  const CONSECUTIVE_FAILURE_THRESHOLD = 5;

  try {
    logger.info("Starting notification queue processing");

    // Fetch pending notifications (limit to prevent timeout)
    const { data: pendingItems, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      logger.info("No pending notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No pending notifications", results }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logger.info("Found pending notifications", { count: pendingItems.length });

    for (const item of pendingItems) {
      results.processed++;

      // Mark as processing
      await supabase
        .from("notification_queue")
        .update({ status: "processing", attempts: item.attempts + 1 })
        .eq("id", item.id);

      try {
        // Check for duplicates if dedup_key is set
        if (item.dedup_key) {
          const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();
          
          // Check email_logs for recent sends with same dedup pattern
          const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("id")
            .eq("template_slug", item.template_slug)
            .gte("created_at", dedupWindowStart)
            .contains("metadata", { dedup_key: item.dedup_key })
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            logger.info("Skipping duplicate", { id: item.id, dedup_key: item.dedup_key });
            
            await supabase
              .from("notification_queue")
              .update({ 
                status: "skipped", 
                processed_at: new Date().toISOString(),
                error_message: "Duplicate detected"
              })
              .eq("id", item.id);
            
            results.skipped_duplicate++;
            continue;
          }
        }

        // Send email via send-email function
        const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
        const response = await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": supabaseServiceKey,
          },
          body: JSON.stringify({
            template_slug: item.template_slug,
            to: item.recipients,
            variables: item.variables || {},
            triggered_by: "queue",
            metadata: {
              ...item.metadata,
              queue_id: item.id,
              dedup_key: item.dedup_key,
            },
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to send email");
        }

        // Mark as sent
        await supabase
          .from("notification_queue")
          .update({ 
            status: "sent", 
            processed_at: new Date().toISOString() 
          })
          .eq("id", item.id);

        results.sent++;
        logger.info("Notification sent", { id: item.id, template: item.template_slug });

      } catch (itemError: any) {
        logger.error("Failed to process notification", { id: item.id, error: itemError.message });

        const newStatus = item.attempts + 1 >= item.max_attempts ? "failed" : "pending";
        
        await supabase
          .from("notification_queue")
          .update({ 
            status: newStatus,
            error_message: itemError.message,
            processed_at: newStatus === "failed" ? new Date().toISOString() : null,
          })
          .eq("id", item.id);

        if (newStatus === "failed") {
          results.failed++;
          results.errors.push(`${item.id}: ${itemError.message}`);
          
          // Log failed queue item to email_logs for visibility in the admin panel
          const recipientDisplay = Array.isArray(item.recipients) 
            ? item.recipients.join(", ") 
            : String(item.recipients);
          
          await supabase.from("email_logs").insert({
            template_slug: item.template_slug,
            template_name: item.template_slug,
            recipient_email: recipientDisplay,
            subject: `[Fila] ${item.template_slug}`,
            status: "failed",
            error_message: `Falha após ${item.max_attempts} tentativas: ${itemError.message}`,
            variables: item.variables || {},
            triggered_by: "queue",
            metadata: {
              queue_id: item.id,
              attempts: item.attempts + 1,
              max_attempts: item.max_attempts,
              dedup_key: item.dedup_key,
              original_error: itemError.message,
              failed_at: new Date().toISOString(),
            },
          });
          
          logger.info("Logged failed queue item to email_logs", { id: item.id });
        }
      }
    }

    // Cleanup old entries
    await supabase.rpc("cleanup_old_notification_queue");

    // Check for consecutive failures and send alert
    const { data: recentFailures } = await supabase
      .from("notification_queue")
      .select("status")
      .order("processed_at", { ascending: false })
      .not("processed_at", "is", null)
      .limit(CONSECUTIVE_FAILURE_THRESHOLD);

    let consecutiveFailCount = 0;
    for (const item of recentFailures || []) {
      if (item.status === "failed") consecutiveFailCount++;
      else break;
    }
    results.consecutive_failures = consecutiveFailCount;

    // Send alert email to admins if threshold reached
    if (consecutiveFailCount >= CONSECUTIVE_FAILURE_THRESHOLD) {
      logger.warn("ALERT: Consecutive failure threshold reached", { count: consecutiveFailCount });
      
      // Get admin emails
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map(r => r.user_id);
        const { data: adminUsers } = await supabase.auth.admin.listUsers();
        
        const adminEmails = adminUsers?.users
          .filter(u => adminUserIds.includes(u.id))
          .map(u => u.email)
          .filter(Boolean) as string[];

        if (adminEmails.length > 0) {
          // Send direct alert (bypass queue to avoid circular failure)
          const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
          await fetch(sendEmailUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": supabaseServiceKey,
            },
            body: JSON.stringify({
              template_slug: "system_alert",
              to: adminEmails,
              variables: {
                alert_type: "Falhas Consecutivas na Fila de Notificações",
                alert_message: `${consecutiveFailCount} notificações falharam consecutivamente. Verifique a configuração do sistema de emails e os logs de erro.`,
                alert_time: new Date().toISOString(),
              },
              triggered_by: "system",
              skip_dedup_check: false,
              metadata: {
                dedup_key: `consecutive_failures_alert:${new Date().toISOString().slice(0, 13)}`, // One alert per hour max
              },
            }),
          });
          logger.info("Alert email sent to admins", { emails: adminEmails });
        }
      }
    }

    logger.info("Processing complete", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    logger.error("Error processing queue", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message, results }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
