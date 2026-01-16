import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = !origin || (
    origin.includes("lovable.app") ||
    origin.includes("lovableproject.com") ||
    origin.includes("webq.com.br") ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080"
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin || "https://webq.com.br") : "https://webq.com.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  };
};

const DEVELOPER_EMAIL = "desenvolvedor@webq.com.br";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Log all headers for debugging
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = key.toLowerCase().includes("key") ? "***" : value;
    });
    console.log("Received headers:", JSON.stringify(headersObj));

    // Check for internal key (for direct calls without user auth)
    const internalKey = req.headers.get("X-Internal-Key") || req.headers.get("x-internal-key");
    
    if (internalKey && internalKey === supabaseServiceKey) {
      console.log("Cleanup initiated via internal key");
    } else {
      // Fallback to user auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (user.email !== DEVELOPER_EMAIL) {
        return new Response(JSON.stringify({ error: "Acesso não autorizado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("Cleanup initiated by:", user.email);
    }

    // Get all users with roles
    const { data: usersWithRoles, error: queryError } = await adminClient
      .from("user_roles")
      .select("user_id");
    
    if (queryError) {
      console.error("Error fetching user roles:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIdsWithRoles = new Set(usersWithRoles?.map(r => r.user_id) || []);
    
    // Get all auth users
    const { data: { users: allUsers }, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error listing users:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find users without roles (orphan users)
    const usersToDelete = allUsers.filter(u => !userIdsWithRoles.has(u.id));
    
    console.log(`Found ${usersToDelete.length} orphan users to delete`);
    
    const deletedUsers: string[] = [];
    const errors: string[] = [];

    for (const orphanUser of usersToDelete) {
      // Delete profile if exists
      await adminClient.from("profiles").delete().eq("user_id", orphanUser.id);
      
      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(orphanUser.id);
      
      if (deleteError) {
        console.error(`Failed to delete user ${orphanUser.email}:`, deleteError);
        errors.push(`${orphanUser.email}: ${deleteError.message}`);
      } else {
        console.log(`Deleted user: ${orphanUser.email}`);
        deletedUsers.push(orphanUser.email || orphanUser.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deleted: deletedUsers,
      errors: errors.length > 0 ? errors : undefined,
      message: `${deletedUsers.length} usuários órfãos deletados`
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in cleanup-orphan-users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
