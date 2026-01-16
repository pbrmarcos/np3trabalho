import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("VERIFY-COOKIE-PURGE-CODE");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin authenticated", { userId: user.id });

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the stored code
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "cookie_purge_code")
      .single();

    if (settingsError || !settingsData) {
      log.error("Settings error", { error: settingsError?.message });
      return new Response(
        JSON.stringify({ error: "Nenhum código de verificação encontrado. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storedData = settingsData.value as {
      code: string;
      expires_at: string;
      requested_by: string;
    };

    // Verify the code matches
    if (storedData.code !== code) {
      log.warn("Code mismatch", { expected: storedData.code, got: code });
      return new Response(JSON.stringify({ error: "Código incorreto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the code hasn't expired
    if (new Date(storedData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count records before deletion
    const { count: beforeCount } = await supabase
      .from("cookie_consent_logs")
      .select("*", { count: "exact", head: true });

    log("Deleting cookie consent logs", { count: beforeCount });

    // Delete all cookie consent logs
    const { error: deleteError } = await supabase
      .from("cookie_consent_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      log.error("Delete error", { error: deleteError.message });
      return new Response(
        JSON.stringify({ error: "Erro ao excluir registros: " + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear the verification code
    await supabase.from("system_settings").delete().eq("key", "cookie_purge_code");

    // Log the action
    await supabase.from("action_logs").insert({
      user_id: user.id,
      user_email: user.email || "unknown",
      action_type: "cookie_logs_purged",
      entity_type: "cookie_consent_logs",
      description: `${beforeCount || 0} registros de consentimento de cookies foram excluídos permanentemente`,
      metadata: { deleted_count: beforeCount || 0, deleted_at: new Date().toISOString() }
    });

    log("Successfully deleted cookie consent logs", { count: beforeCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${beforeCount || 0} registros excluídos com sucesso`,
        deleted_count: beforeCount || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    log.error("Error in function", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
