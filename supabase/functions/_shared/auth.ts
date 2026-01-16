// ============================================
// AUTENTICAÇÃO E AUTORIZAÇÃO CENTRALIZADAS
// ============================================

import { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============================================
// TIPOS
// ============================================

export type AuthSuccess = {
  user: User;
  error?: never;
};

export type AuthError = {
  user?: never;
  error: Response;
};

export type AuthResult = AuthSuccess | AuthError;

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * Extrai e valida o token JWT do header Authorization
 * Retorna o usuário autenticado ou uma resposta de erro
 */
export async function verifyJWT(
  req: Request,
  supabase: SupabaseClient,
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      error: new Response(
        JSON.stringify({ error: "Token de autorização não fornecido" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError) {
    return {
      error: new Response(
        JSON.stringify({ error: `Erro de autenticação: ${userError.message}` }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  const user = userData.user;

  if (!user) {
    return {
      error: new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { user };
}

/**
 * Verifica se o usuário autenticado tem role de admin
 * Combina verificação de JWT + checagem de role
 */
export async function requireAdmin(
  req: Request,
  supabase: SupabaseClient,
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  // Primeiro verifica JWT
  const jwtResult = await verifyJWT(req, supabase, corsHeaders);

  if (jwtResult.error) {
    return jwtResult;
  }

  const user = jwtResult.user;

  // Verifica role de admin
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    return {
      error: new Response(
        JSON.stringify({ error: "Acesso negado: permissão de administrador necessária" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { user };
}

/**
 * Verifica se o usuário autenticado tem role de client
 * Combina verificação de JWT + checagem de role
 */
export async function requireClient(
  req: Request,
  supabase: SupabaseClient,
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  // Primeiro verifica JWT
  const jwtResult = await verifyJWT(req, supabase, corsHeaders);

  if (jwtResult.error) {
    return jwtResult;
  }

  const user = jwtResult.user;

  // Verifica role de client
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "client")
    .maybeSingle();

  if (roleError || !roleData) {
    return {
      error: new Response(
        JSON.stringify({ error: "Acesso negado: permissão de cliente necessária" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { user };
}

/**
 * Verifica chamadas internas usando X-Internal-Key
 * Retorna null se válido, ou uma Response de erro
 */
export function verifyInternalKey(
  req: Request,
  corsHeaders: Record<string, string>
): Response | null {
  const internalKey = req.headers.get("X-Internal-Key");
  const expectedKey = Deno.env.get("INTERNAL_API_KEY");

  if (!expectedKey) {
    // Se não há chave configurada, não permite chamadas internas
    return new Response(
      JSON.stringify({ error: "Chamadas internas não configuradas" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!internalKey || internalKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: "Chave interna inválida" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return null; // Válido
}

// Re-export para conveniência
export type { User };
