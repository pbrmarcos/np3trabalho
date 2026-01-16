import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminEmails = [
      { email: "suporte@webq.com.br", name: "Suporte WebQ" },
      { email: "atendimento@webq.com.br", name: "Atendimento WebQ" },
      { email: "desenvolvedor@webq.com.br", name: "Desenvolvedor WebQ" },
    ];

    const results = [];
    const defaultPassword = "WebQ@2024!"; // Initial password - should be changed

    for (const admin of adminEmails) {
      console.log(`Creating admin user: ${admin.email}`);
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers?.users.some(u => u.email === admin.email);
      
      if (userExists) {
        console.log(`User ${admin.email} already exists, skipping creation`);
        
        // Update role to admin if not already
        const existingUser = existingUsers?.users.find(u => u.email === admin.email);
        if (existingUser) {
          // Check if already has admin role
          const { data: roleData } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", existingUser.id)
            .maybeSingle();
          
          if (roleData?.role !== "admin") {
            // Update to admin role
            await supabaseAdmin
              .from("user_roles")
              .upsert({
                user_id: existingUser.id,
                role: "admin",
              }, { onConflict: "user_id,role" });
          }
        }
        
        results.push({ email: admin.email, status: "exists", message: "User already exists, role updated" });
        continue;
      }
      
      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: admin.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: admin.name,
        },
      });
      
      if (userError) {
        console.error(`Error creating user ${admin.email}:`, userError);
        results.push({ email: admin.email, status: "error", message: userError.message });
        continue;
      }
      
      if (userData.user) {
        // Update role to admin (trigger creates as client by default)
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: "admin" })
          .eq("user_id", userData.user.id);
        
        if (roleError) {
          console.error(`Error updating role for ${admin.email}:`, roleError);
        }
        
        results.push({ email: admin.email, status: "created", message: "User created successfully" });
      }
    }

    console.log("Admin users creation completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        note: `Default password for new accounts: ${defaultPassword}. Please change it after first login.`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-admin-users:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
