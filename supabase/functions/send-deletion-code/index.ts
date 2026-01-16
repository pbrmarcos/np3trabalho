import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders, PRODUCTION_URL } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("SEND-DELETION-CODE");
const DEVELOPER_EMAIL = "desenvolvedor@webq.com.br";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      log.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Serviço de email não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin authenticated", { email: user.email });

    // Only developer can delete clients
    if (user.email !== DEVELOPER_EMAIL) {
      log.error("Non-developer admin attempted deletion", { email: user.email });
      return new Response(JSON.stringify({ error: "Apenas o desenvolvedor pode excluir clientes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email configuration
    const { data: emailConfigData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "email_config")
      .single();

    const emailConfig = emailConfigData?.value as { sender_email?: string; sender_name?: string } | null;
    const senderEmail = emailConfig?.sender_email || "noreply@webq.com.br";
    const senderName = emailConfig?.sender_name || "WebQ";

    const { client_id, client_name } = await req.json();
    
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    log("Generated deletion code", { clientId: client_id });

    const { error: insertError } = await supabase
      .from("deletion_verification_codes")
      .insert({
        client_id,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      log.error("Error inserting verification code", { error: insertError.message });
      return new Response(JSON.stringify({ error: "Erro ao gerar código" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [DEVELOPER_EMAIL],
      subject: "⚠️ Código de Verificação para Exclusão de Cliente",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">⚠️ Solicitação de Exclusão de Cliente</h1>
          <p>Você solicitou a exclusão permanente do cliente:</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Cliente:</strong> ${client_name || "N/A"}<br>
            <strong>ID:</strong> ${client_id}
          </div>
          <p>Use o código abaixo para confirmar a exclusão:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Este código expira em <strong>10 minutos</strong>.</p>
        </div>
      `,
    });

    log("Email sent successfully");

    return new Response(JSON.stringify({ success: true, message: "Código enviado para seu email" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    log.error("Error in function", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
