// ============================================
// CRIAÇÃO CENTRALIZADA DE CLIENTES SUPABASE
// ============================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Cria um cliente Supabase com permissões de admin (service role)
 * Use para operações que precisam bypass de RLS
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Cria um cliente Supabase com permissões anônimas
 * Use para operações que respeitam RLS
 */
export function createAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

// Re-export para conveniência
export type { SupabaseClient };
