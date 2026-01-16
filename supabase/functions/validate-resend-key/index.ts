import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("VALIDATE-RESEND-KEY");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting Resend key validation");

    const supabase = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Authenticated admin user", { userId: user.id });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      log("No RESEND_API_KEY found in environment");
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'RESEND_API_KEY não está configurada nas variáveis de ambiente',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log("RESEND_API_KEY found, testing connection");

    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      log.error("Resend API error", { status: response.status, error: errorData });
      return new Response(
        JSON.stringify({
          valid: false,
          message: `Erro na API do Resend: ${errorData.message || response.statusText}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const domains = data.data || [];

    log("Resend connection successful", { domainCount: domains.length });

    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Conexão com Resend estabelecida com sucesso',
        domains: domains.map((d: { id: string; name: string; status: string; created_at: string }) => ({
          id: d.id, name: d.name, status: d.status, created_at: d.created_at,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error("Unexpected error", { error: errorMessage });
    
    let userMessage = 'Erro ao validar chave do Resend';
    if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
      userMessage = 'Chave de API inválida ou sem permissões';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = 'Erro de conexão com a API do Resend';
    }

    return new Response(
      JSON.stringify({ valid: false, message: userMessage, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
