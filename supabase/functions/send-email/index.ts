import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Note: send-email needs x-internal-key header, so we override the base headers
const getSendEmailCorsHeaders = (origin: string | null) => {
  const baseHeaders = getCorsHeaders(origin);
  return {
    ...baseHeaders,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  };
};

// Zod schema for email request validation
const ManualContentSchema = z.object({
  subject: z.string().min(1, "Assunto é obrigatório").max(200, "Assunto muito longo"),
  html_body: z.string().min(1, "Corpo do email é obrigatório").max(500000, "Corpo do email muito grande"),
});

const SendEmailSchema = z.object({
  template_slug: z.string().min(1).max(100).optional(),
  to: z.array(z.string().min(1).max(255)).min(1, "Destinatário é obrigatório").max(50, "Máximo 50 destinatários"),
  variables: z.record(z.string()).optional().default({}),
  manual_content: ManualContentSchema.optional(),
  triggered_by: z.enum(["manual", "app", "webhook", "cron", "queue"]).optional().default("manual"),
  metadata: z.record(z.any()).optional().default({}),
  skip_dedup_check: z.boolean().optional().default(false),
}).refine(
  (data) => data.template_slug || data.manual_content,
  { message: "template_slug ou manual_content deve ser fornecido" }
);

// Deduplication window in minutes
const DEDUP_WINDOW_MINUTES = 5;

interface SendEmailRequest {
  template_slug?: string;
  to: string[];
  variables?: Record<string, string>;
  manual_content?: {
    subject: string;
    html_body: string;
  };
  triggered_by?: string;
  metadata?: Record<string, any>;
  skip_dedup_check?: boolean;
}

// Simple in-memory rate limiter (per-user, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetTime - now };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count, resetIn: userLimit.resetTime - now };
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

// Retry function with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
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

// Check if string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Result type for recipient resolution
interface ResolveRecipientsResult {
  resolvedEmails: string[];
  unresolvedUserIds: string[];
  invalidRecipients: string[];
}

// Resolve user IDs to emails
const resolveRecipients = async (
  supabase: any,
  recipients: string[]
): Promise<ResolveRecipientsResult> => {
  const resolvedEmails: string[] = [];
  const unresolvedUserIds: string[] = [];
  const invalidRecipients: string[] = [];
  const userIdsToResolve: string[] = [];

  // Separate emails from user IDs
  for (const recipient of recipients) {
    if (isUUID(recipient)) {
      userIdsToResolve.push(recipient);
    } else if (recipient.includes('@')) {
      resolvedEmails.push(recipient);
    } else {
      invalidRecipients.push(recipient);
    }
  }

  // Resolve user IDs to emails using auth.admin
  if (userIdsToResolve.length > 0) {
    logStep("Resolving user IDs to emails", { count: userIdsToResolve.length });
    
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (!error && users) {
      for (const userId of userIdsToResolve) {
        const user = users.find((u: any) => u.id === userId);
        if (user?.email) {
          resolvedEmails.push(user.email);
          logStep("Resolved user", { userId, email: user.email });
        } else {
          unresolvedUserIds.push(userId);
          logStep("Could not resolve user ID - user not found", { userId });
        }
      }
    } else {
      logStep("Error listing users", { error: error?.message });
      // Add all user IDs as unresolved if we couldn't list users
      unresolvedUserIds.push(...userIdsToResolve);
    }
  }

  return { resolvedEmails, unresolvedUserIds, invalidRecipients };
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getSendEmailCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check for internal calls from other edge functions (webhooks, cron)
  const internalKey = req.headers.get("X-Internal-Key");
  const isInternalCall = internalKey === supabaseServiceKey;

  // Parse and validate body with Zod
  let bodyData: z.infer<typeof SendEmailSchema>;
  try {
    const bodyText = await req.text();
    const rawBody = JSON.parse(bodyText);
    const parseResult = SendEmailSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error("[SEND-EMAIL] Validation failed:", errorMessage);
      return new Response(
        JSON.stringify({ error: `Dados inválidos: ${errorMessage}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    bodyData = parseResult.data;
  } catch (parseError) {
    console.error("[SEND-EMAIL] JSON parse error:", parseError);
    return new Response(
      JSON.stringify({ error: "Formato de dados inválido" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const triggeredBy = bodyData.triggered_by || 'manual';
  const isAppTriggered = triggeredBy === 'app';

  let authenticatedUserId: string | null = null;
  let isAdmin = false;

  if (isInternalCall) {
    logStep("Authenticated via internal service key (webhook/cron)");
  } else {
    // External call - verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[SEND-EMAIL] No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("[SEND-EMAIL] Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    authenticatedUserId = user.id;

    // Check if user is an admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    isAdmin = !!roleData;

    // For manual sends (not app-triggered), require admin role
    if (!isAppTriggered && !isAdmin) {
      console.error("[SEND-EMAIL] User is not an admin for manual send:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required for manual sends" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting check (only for manual admin calls, not app-triggered)
    if (!isAppTriggered && isAdmin) {
      const rateLimit = checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
        logStep("Rate limit exceeded", { userId: user.id, resetIn: resetMinutes });
        return new Response(
          JSON.stringify({ 
            error: `Rate limit exceeded. Try again in ${resetMinutes} minutes.`,
            remaining: 0,
            resetIn: rateLimit.resetIn
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      logStep("Authenticated admin user", { userId: user.id, emailsRemaining: rateLimit.remaining });
    } else if (isAppTriggered) {
      logStep("App-triggered email from authenticated user", { userId: user.id, isAdmin });
    }
  }

  let logData: {
    template_slug?: string;
    template_name?: string;
    recipient_email: string;
    subject: string;
    status: string;
    resend_id?: string;
    error_message?: string;
    variables: Record<string, string>;
    triggered_by: string;
    metadata: Record<string, any>;
  } | null = null;

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Use bodyData that was already parsed for auth
    const { 
      template_slug, 
      to, 
      variables = {}, 
      manual_content,
      metadata = {},
      skip_dedup_check = false
    } = bodyData;

    if (!to || to.length === 0) {
      throw new Error("No recipients specified");
    }

    logStep("Processing email request", { template_slug, to, triggeredBy });

    // DEDUPLICATION CHECK: Skip duplicate emails sent within the window
    if (!skip_dedup_check && template_slug && metadata.dedup_key) {
      const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();
      
      const { data: recentLogs } = await supabase
        .from("email_logs")
        .select("id, created_at")
        .eq("template_slug", template_slug)
        .gte("created_at", dedupWindowStart)
        .contains("metadata", { dedup_key: metadata.dedup_key })
        .limit(1);

      if (recentLogs && recentLogs.length > 0) {
        logStep("Duplicate email detected, skipping", { 
          template_slug, 
          dedup_key: metadata.dedup_key,
          last_sent: recentLogs[0].created_at 
        });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            reason: "Duplicate detected",
            dedup_key: metadata.dedup_key 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Resolve recipients (convert user IDs to emails)
    const recipientResult = await resolveRecipients(supabase, to);
    const resolvedRecipients = recipientResult.resolvedEmails;
    
    // Log skipped emails for unresolved user IDs
    if (recipientResult.unresolvedUserIds.length > 0) {
      logStep("Logging unresolved recipients to email_logs", { 
        count: recipientResult.unresolvedUserIds.length,
        userIds: recipientResult.unresolvedUserIds 
      });
      
      await supabase.from("email_logs").insert({
        template_slug: template_slug || null,
        template_name: template_slug ? `Template: ${template_slug}` : "Email Manual",
        recipient_email: recipientResult.unresolvedUserIds.join(", "),
        subject: `[Não enviado] ${template_slug || "Email Manual"}`,
        status: "skipped",
        error_message: `Usuário(s) não encontrado(s) no sistema - ${recipientResult.unresolvedUserIds.length} destinatário(s) não resolvido(s)`,
        variables,
        triggered_by: triggeredBy,
        metadata: {
          ...metadata,
          reason: "user_not_found",
          unresolved_user_ids: recipientResult.unresolvedUserIds,
          original_recipients: to,
          skipped_at: new Date().toISOString(),
        },
      });
    }
    
    // Log invalid recipients
    if (recipientResult.invalidRecipients.length > 0) {
      await supabase.from("email_logs").insert({
        template_slug: template_slug || null,
        template_name: template_slug ? `Template: ${template_slug}` : "Email Manual",
        recipient_email: recipientResult.invalidRecipients.join(", "),
        subject: `[Não enviado] ${template_slug || "Email Manual"}`,
        status: "skipped",
        error_message: `Formato de destinatário inválido - não é email nem UUID`,
        variables,
        triggered_by: triggeredBy,
        metadata: {
          ...metadata,
          reason: "invalid_recipient_format",
          invalid_recipients: recipientResult.invalidRecipients,
          skipped_at: new Date().toISOString(),
        },
      });
    }
    
    if (resolvedRecipients.length === 0) {
      logStep("No valid email recipients found after resolution");
      
      // If all recipients were unresolved, return success but with skip info
      if (recipientResult.unresolvedUserIds.length > 0 || recipientResult.invalidRecipients.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            reason: "No valid recipients after resolution",
            unresolved_count: recipientResult.unresolvedUserIds.length,
            invalid_count: recipientResult.invalidRecipients.length
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "No valid email recipients found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Resolved recipients", { 
      original: to, 
      resolved: resolvedRecipients,
      unresolved: recipientResult.unresolvedUserIds,
      invalid: recipientResult.invalidRecipients
    });

    let subject: string;
    let htmlBody: string;
    let copyToAdmins = false;
    let templateName = "Manual Email";

    // Get default sender config from system_settings
    const { data: emailConfigData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "email_config")
      .maybeSingle();

    const emailConfig = emailConfigData?.value || {};
    let senderEmail = emailConfig.sender_email || "noreply@webq.com.br";
    let senderName = emailConfig.sender_name || "WebQ";

    if (manual_content) {
      subject = manual_content.subject;
      htmlBody = manual_content.html_body;
    } else if (template_slug) {
      const { data: template, error: templateError } = await supabase
        .from("system_email_templates")
        .select("*")
        .eq("slug", template_slug)
        .single();

      if (templateError || !template) {
        throw new Error(`Template not found: ${template_slug}`);
      }

      templateName = template.name;

      if (!template.is_active) {
        logStep(`Template ${template_slug} is inactive, skipping send`);
        
        await supabase.from("email_logs").insert({
          template_slug,
          template_name: templateName,
          recipient_email: resolvedRecipients.join(", "),
          subject: template.subject,
          status: "skipped",
          variables,
          triggered_by: triggeredBy,
          metadata: { ...metadata, reason: "Template inactive" }
        });

        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Template inactive" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      subject = template.subject;
      htmlBody = template.html_template;
      senderEmail = template.sender_email;
      senderName = template.sender_name;
      copyToAdmins = template.copy_to_admins;

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        subject = subject.replace(regex, value);
        htmlBody = htmlBody.replace(regex, value);
      });
    } else {
      throw new Error("Either template_slug or manual_content must be provided");
    }

    // Initialize log data
    logData = {
      template_slug: template_slug || undefined,
      template_name: templateName,
      recipient_email: resolvedRecipients.join(", "),
      subject,
      status: "pending",
      variables,
      triggered_by: triggeredBy,
      metadata
    };

    // Get logo URL for header
    const { data: logoConfig } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "brand_logos_config")
      .maybeSingle();

    const logoUrl = logoConfig?.value?.fullLogoDark || "https://ayqhypvxmqoqassouekm.supabase.co/storage/v1/object/public/admin-media/logo/1765369998280-ue8kbe.png";

    // Get custom footer from system_settings
    const { data: footerConfig } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "email_footer")
      .maybeSingle();

    // Use custom footer if configured, otherwise use default
    const customFooterHtml = footerConfig?.value?.html;
    const defaultFooter = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; font-weight: bold;">
                      Este é um email automático. Por favor, não responda.
                    </p>
                    <p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px;">
                      Para entrar em contato: <a href="mailto:suporte@webq.com.br" style="color: #3b82f6; text-decoration: none; font-weight: bold;">suporte@webq.com.br</a>
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
                          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                            &copy; ${new Date().getFullYear()} WebQ - Sites Profissionais<br />
                            Transformando ideias em presença digital
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;

    const footerContent = customFooterHtml || defaultFooter;
    logStep("Footer config", { hasCustomFooter: !!customFooterHtml });

    // Build full HTML with Outlook-compatible layout (no gradients, no border-radius)
    const fullHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <!-- Wrapper table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!-- Main container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          
          <!-- Header with Logo - solid color for Outlook compatibility -->
          <tr>
            <td align="center" style="background-color: #1E2A47; padding: 30px 40px;">
              <img src="${logoUrl}" alt="WebQ" width="180" height="50" style="display: block; height: 50px; max-width: 180px; border: 0;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; color: #333333; font-size: 16px; line-height: 24px; font-family: Arial, Helvetica, sans-serif;">
              ${htmlBody}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
              ${footerContent}
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send main email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: resolvedRecipients,
        subject: subject,
        html: fullHtml,
      }),
    });

    // Send main email with retry
    const emailResult = await withRetry(async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: resolvedRecipients,
          subject: subject,
          html: fullHtml,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send email");
      }

      return result;
    }, 3, 1000, "Resend API call");

    logStep("Email sent successfully", { id: emailResult.id, to: resolvedRecipients });
    logData.status = "sent";
    logData.resend_id = emailResult.id;

    // Log successful email with retry
    await withRetry(
      async () => { await supabase.from("email_logs").insert(logData); },
      2, 500, "Email log insert"
    );

    // Send copy to admins if enabled
    if (copyToAdmins) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        
        const { data: { users: adminUsers } } = await supabase.auth.admin.listUsers();
        const adminEmails = adminUsers
          ?.filter(u => adminIds.includes(u.id))
          .map(u => u.email)
          .filter(Boolean) as string[];

        // Filter out recipients that are already in the main send
        const uniqueAdminEmails = adminEmails.filter(e => !resolvedRecipients.includes(e));

        if (uniqueAdminEmails.length > 0) {
          const adminCopyResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${senderName} <${senderEmail}>`,
              to: uniqueAdminEmails,
              subject: `[Cópia Admin] ${subject}`,
              html: fullHtml,
            }),
          });

          if (adminCopyResponse.ok) {
            logStep("Admin copy sent to", uniqueAdminEmails);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: emailResult.id, sent_to: resolvedRecipients }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("Error in send-email function", { error: error.message });
    
    // Log failed email if we have log data
    if (logData && logData.status === "pending") {
      logData.status = "failed";
      logData.error_message = error.message;
      try {
        await supabase.from("email_logs").insert(logData);
      } catch (logError) {
        console.error("Failed to log email error:", logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
