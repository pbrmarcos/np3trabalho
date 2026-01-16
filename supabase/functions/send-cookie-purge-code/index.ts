import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("SEND-COOKIE-PURGE-CODE");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      log.error("RESEND_API_KEY not configured");
      throw new Error("Serviço de e-mail não configurado");
    }

    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin verified", { userId: user.id });

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get count of cookie consent logs
    const { count, error: countError } = await supabase
      .from("cookie_consent_logs")
      .select("*", { count: "exact", head: true });

    if (countError) {
      log.error("Count error", { error: countError.message });
    }

    const totalRecords = count || 0;

    // Store the code in system_settings temporarily
    const { error: settingsError } = await supabase
      .from("system_settings")
      .upsert({
        key: "cookie_purge_code",
        value: { 
          code, 
          expires_at: expiresAt.toISOString(),
          requested_by: user.id,
          requested_at: new Date().toISOString()
        },
        updated_by: user.id
      }, { onConflict: "key" });

    if (settingsError) {
      log.error("Settings error", { error: settingsError.message });
      throw new Error("Erro ao gerar código de verificação");
    }

    // Get admin profile for the email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const adminName = profile?.full_name || user.email || "Administrador";
    const adminEmail = profile?.email || user.email || "Desconhecido";

    // Send email to developer
    log("Sending purge verification email to desenvolvedor@webq.com.br");
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              ⚠️ Solicitação de Exclusão de Dados
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Uma solicitação de exclusão de <strong>todos os registros de consentimento de cookies</strong> foi feita no painel administrativo.
            </p>
            
            <!-- Info Box -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">Detalhes da Solicitação</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; padding: 5px 0; font-size: 14px;">Solicitante:</td>
                  <td style="color: #1e293b; padding: 5px 0; font-size: 14px; font-weight: 500;">${adminName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 5px 0; font-size: 14px;">E-mail:</td>
                  <td style="color: #1e293b; padding: 5px 0; font-size: 14px; font-weight: 500;">${adminEmail}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 5px 0; font-size: 14px;">Data/Hora:</td>
                  <td style="color: #1e293b; padding: 5px 0; font-size: 14px; font-weight: 500;">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 5px 0; font-size: 14px;">Registros a excluir:</td>
                  <td style="color: #dc2626; padding: 5px 0; font-size: 14px; font-weight: 700;">${totalRecords.toLocaleString('pt-BR')} registros</td>
                </tr>
              </table>
            </div>
            
            <!-- Code Box -->
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Código de Verificação:</p>
              <div style="background-color: #1e293b; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
                ${code}
              </div>
              <p style="color: #dc2626; font-size: 12px; margin-top: 10px;">
                ⏱️ Este código expira em 10 minutos
              </p>
            </div>
            
            <!-- Warning -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
                <strong>⚠️ Atenção:</strong> Esta ação é irreversível. Todos os registros de consentimento de cookies serão permanentemente excluídos do banco de dados. Certifique-se de que esta ação é intencional antes de fornecer o código.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Este e-mail foi enviado automaticamente pelo sistema WebQ.<br>
              Por favor, não responda a este e-mail.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "WebQ Sistema <noreply@webq.com.br>",
        to: ["desenvolvedor@webq.com.br"],
        subject: "🔐 Código de Verificação - Exclusão de Registros de Cookies",
        html: htmlBody,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      log.error("Resend API error", { error: emailResult });
      throw new Error(emailResult.message || "Erro ao enviar e-mail");
    }

    log("Email sent successfully", { resendId: emailResult.id });

    // Log the action
    await supabase.from("action_logs").insert({
      user_id: user.id,
      user_email: user.email || "unknown",
      action_type: "cookie_purge_code_sent",
      entity_type: "cookie_consent_logs",
      description: `Código de exclusão de cookies enviado para desenvolvedor@webq.com.br (${totalRecords} registros)`,
      metadata: { total_records: totalRecords }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código enviado para desenvolvedor@webq.com.br",
        total_records: totalRecords
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    log.error("Error in function", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
