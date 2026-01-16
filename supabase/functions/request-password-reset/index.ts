import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("REQUEST-PASSWORD-RESET");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Password reset requested", { email });

    const supabaseAdmin = createAdminClient();

    // Check if user exists (without revealing it to the user)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      logger.error("Error listing users", { error: listError.message });
      // Still return success to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá instruções de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      logger.info("User not found, logging to email_logs and returning success to prevent enumeration");
      
      // Log the skipped email to email_logs for admin visibility
      await supabaseAdmin.from("email_logs").insert({
        recipient_email: email.toLowerCase(),
        subject: "Recuperação de Senha (não enviado)",
        template_slug: "password_reset",
        template_name: "Recuperação de Senha",
        status: "skipped",
        error_message: "Usuário não encontrado no sistema - email não enviado por segurança",
        triggered_by: "request-password-reset",
        metadata: {
          reason: "user_not_found",
          requested_at: new Date().toISOString(),
        },
      });
      
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá instruções de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      logger.error("Error saving token", { error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's name from profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const customerName = profile?.full_name || email.split("@")[0];

    // Build reset link - always use production URL for emails
    const resetLink = `https://webq.com.br/redefinir-senha?token=${token}`;

    logger.info("Reset link generated");

    // Send password_reset email using internal call
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    
    const emailResponse = await fetch(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": supabaseServiceKey,
      },
      body: JSON.stringify({
        template_slug: "password_reset",
        to: [email],
        variables: {
          customer_name: customerName,
          reset_link: resetLink,
        },
        triggered_by: "request-password-reset",
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      logger.error("Error sending email", { error: errorText });
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, você receberá instruções de recuperação." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Error in request-password-reset", { error });
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
