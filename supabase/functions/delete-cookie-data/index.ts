import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 3 requests per session per hour
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3;

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (entry.count >= MAX_REQUESTS) {
    console.log(`[delete-cookie-data] Rate limited session: ${sessionId.substring(0, 8)}...`);
    return true;
  }
  
  entry.count++;
  return false;
}

// Validate session ID format (UUID v4)
function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== "string") return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(sessionId);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { session_id } = body;

    console.log(`[delete-cookie-data] Received deletion request`);

    // Validate session ID format
    if (!isValidSessionId(session_id)) {
      console.log("[delete-cookie-data] Invalid session ID format");
      return new Response(
        JSON.stringify({ error: "ID de sessão inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    if (isRateLimited(session_id)) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if any records exist for this session
    const { data: existingRecords, error: checkError } = await supabase
      .from("cookie_consent_logs")
      .select("id")
      .eq("session_id", session_id)
      .limit(1);

    if (checkError) {
      console.error("[delete-cookie-data] Error checking records:", checkError);
      throw new Error("Erro ao verificar registros");
    }

    if (!existingRecords || existingRecords.length === 0) {
      console.log("[delete-cookie-data] No records found for session");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum dado encontrado para este ID de sessão",
          deleted_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete all records for this session ID
    const { error: deleteError, count } = await supabase
      .from("cookie_consent_logs")
      .delete()
      .eq("session_id", session_id)
      .select("id");

    if (deleteError) {
      console.error("[delete-cookie-data] Error deleting records:", deleteError);
      throw new Error("Erro ao deletar registros");
    }

    const deletedCount = count || 0;
    console.log(`[delete-cookie-data] Deleted ${deletedCount} records for session ${session_id.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${deletedCount} registro(s) deletado(s) com sucesso`,
        deleted_count: deletedCount 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[delete-cookie-data] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
