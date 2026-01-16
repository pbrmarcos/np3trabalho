import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const getCorsHeaders = (origin: string | null) => {
  // Allow Lovable preview URLs and production domains
  const isAllowed = origin && (
    origin.includes("lovable.app") ||
    origin.includes("lovableproject.com") ||
    origin.includes("webq.com.br") ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080"
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://webq.com.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the JWT token
    const token = authHeader.replace("Bearer ", "");
    
    // Use service role client to verify the user from the token
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from the JWT token using admin API
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    console.log("User from token:", user?.email, "Error:", userError?.message);
    
    if (userError || !user) {
      console.error("Could not get user from token:", userError?.message);
      return new Response(JSON.stringify({ error: "Token inválido ou expirado. Faça login novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (user.email !== DEVELOPER_EMAIL) {
      console.error("Unauthorized access attempt:", user.email);
      return new Response(JSON.stringify({ error: "Acesso não autorizado. Apenas o desenvolvedor pode excluir clientes." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, verification_code } = await req.json();
    
    if (!client_id || !verification_code) {
      return new Response(JSON.stringify({ error: "client_id e verification_code são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Attempting to delete client ${client_id} with code ${verification_code}`);

    // Verify the code
    const { data: codeData, error: codeError } = await supabase
      .from("deletion_verification_codes")
      .select("*")
      .eq("client_id", client_id)
      .eq("code", verification_code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeData) {
      console.error("Invalid or expired verification code");
      return new Response(JSON.stringify({ error: "Código inválido ou expirado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as used
    await supabase
      .from("deletion_verification_codes")
      .update({ used: true })
      .eq("id", codeData.id);

    console.log(`Starting deletion cascade for client: ${client_id}`);

    // Get all project IDs for this client
    const { data: projects } = await supabase
      .from("client_projects")
      .select("id")
      .eq("client_id", client_id);

    const projectIds = projects?.map(p => p.id) || [];
    console.log(`Found ${projectIds.length} projects to delete`);

    // Get all ticket IDs for cascade deletion
    let ticketIds: string[] = [];
    if (projectIds.length > 0) {
      const { data: tickets } = await supabase
        .from("project_tickets")
        .select("id")
        .in("project_id", projectIds);
      ticketIds = tickets?.map(t => t.id) || [];
    }
    console.log(`Found ${ticketIds.length} tickets to delete`);

    // Get all design order IDs for this client
    const { data: designOrders } = await supabase
      .from("design_orders")
      .select("id")
      .eq("client_id", client_id);
    const designOrderIds = designOrders?.map(o => o.id) || [];
    console.log(`Found ${designOrderIds.length} design orders to delete`);

    // Get all design delivery IDs for cascade deletion
    let designDeliveryIds: string[] = [];
    if (designOrderIds.length > 0) {
      const { data: deliveries } = await supabase
        .from("design_deliveries")
        .select("id")
        .in("order_id", designOrderIds);
      designDeliveryIds = deliveries?.map(d => d.id) || [];
    }
    console.log(`Found ${designDeliveryIds.length} design deliveries to delete`);

    // Delete in correct order (respecting foreign keys)

    // 1. Delete design feedback
    if (designDeliveryIds.length > 0) {
      const { error } = await supabase
        .from("design_feedback")
        .delete()
        .in("delivery_id", designDeliveryIds);
      if (error) console.error("Error deleting design_feedback:", error);
      else console.log("Deleted design_feedback");
    }

    // 2. Delete design delivery files from database AND storage
    if (designDeliveryIds.length > 0) {
      const { data: deliveryFiles } = await supabase
        .from("design_delivery_files")
        .select("file_url")
        .in("delivery_id", designDeliveryIds);

      // Delete from storage (design-files and brand-files buckets)
      if (deliveryFiles && deliveryFiles.length > 0) {
        for (const file of deliveryFiles) {
          try {
            const url = new URL(file.file_url);
            // Try design-files bucket
            const designMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/design-files\/(.*)/);
            if (designMatch) {
              await supabase.storage.from("design-files").remove([designMatch[1]]);
            }
            // Try brand-files bucket
            const brandMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/brand-files\/(.*)/);
            if (brandMatch) {
              await supabase.storage.from("brand-files").remove([brandMatch[1]]);
            }
          } catch (e) {
            console.error("Error deleting delivery file from storage:", e);
          }
        }
        console.log("Deleted design delivery files from storage");
      }

      const { error } = await supabase
        .from("design_delivery_files")
        .delete()
        .in("delivery_id", designDeliveryIds);
      if (error) console.error("Error deleting design_delivery_files:", error);
      else console.log("Deleted design_delivery_files");
    }

    // 3. Delete design deliveries
    if (designOrderIds.length > 0) {
      const { error } = await supabase
        .from("design_deliveries")
        .delete()
        .in("order_id", designOrderIds);
      if (error) console.error("Error deleting design_deliveries:", error);
      else console.log("Deleted design_deliveries");
    }

    // 4. Delete design orders
    const { error: designOrdersError } = await supabase
      .from("design_orders")
      .delete()
      .eq("client_id", client_id);
    if (designOrdersError) console.error("Error deleting design_orders:", designOrdersError);
    else console.log("Deleted design_orders");

    // 5. Delete ticket messages
    if (ticketIds.length > 0) {
      const { error } = await supabase
        .from("ticket_messages")
        .delete()
        .in("ticket_id", ticketIds);
      if (error) console.error("Error deleting ticket_messages:", error);
      else console.log("Deleted ticket_messages");
    }

    // 6. Delete project tickets
    if (projectIds.length > 0) {
      const { error } = await supabase
        .from("project_tickets")
        .delete()
        .in("project_id", projectIds);
      if (error) console.error("Error deleting project_tickets:", error);
      else console.log("Deleted project_tickets");
    }

    // 7. Delete timeline messages
    const { error: timelineError } = await supabase
      .from("timeline_messages")
      .delete()
      .eq("client_id", client_id);
    if (timelineError) console.error("Error deleting timeline_messages:", timelineError);
    else console.log("Deleted timeline_messages");

    // 8. Delete project credentials
    if (projectIds.length > 0) {
      const { error } = await supabase
        .from("project_credentials")
        .delete()
        .in("project_id", projectIds);
      if (error) console.error("Error deleting project_credentials:", error);
      else console.log("Deleted project_credentials");
    }

    // 9. Delete project files from database AND storage
    if (projectIds.length > 0) {
      // Get file paths for storage deletion
      const { data: files } = await supabase
        .from("project_files")
        .select("file_url")
        .in("project_id", projectIds);

      // Delete from storage
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // Extract path from URL
            const url = new URL(file.file_url);
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/project-files\/(.*)/);
            if (pathMatch) {
              await supabase.storage.from("project-files").remove([pathMatch[1]]);
            }
          } catch (e) {
            console.error("Error deleting file from storage:", e);
          }
        }
        console.log("Deleted files from storage");
      }

      // Delete from database
      const { error } = await supabase
        .from("project_files")
        .delete()
        .in("project_id", projectIds);
      if (error) console.error("Error deleting project_files:", error);
      else console.log("Deleted project_files from database");
    }

    // 14. Delete notifications
    const { error: notifError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", client_id);
    if (notifError) console.error("Error deleting notifications:", notifError);
    else console.log("Deleted notifications");

    // 15. Delete client projects
    const { error: projectsError } = await supabase
      .from("client_projects")
      .delete()
      .eq("client_id", client_id);
    if (projectsError) console.error("Error deleting client_projects:", projectsError);
    else console.log("Deleted client_projects");

    // 16. Delete client onboarding (also delete logo from storage)
    const { error: onboardingError } = await supabase
      .from("client_onboarding")
      .delete()
      .eq("user_id", client_id);
    if (onboardingError) console.error("Error deleting client_onboarding:", onboardingError);
    else console.log("Deleted client_onboarding");

    // 8. Delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", client_id);
    if (profileError) console.error("Error deleting profiles:", profileError);
    else console.log("Deleted profiles");

    // 9. Delete user roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", client_id);
    if (rolesError) console.error("Error deleting user_roles:", rolesError);
    else console.log("Deleted user_roles");

    // 10. Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(client_id);
    if (authError) {
      console.error("Error deleting auth user:", authError);
      return new Response(JSON.stringify({ 
        error: "Dados excluídos mas houve erro ao excluir usuário de autenticação",
        partial: true 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Deleted auth user");

    // 11. Clean up any remaining deletion codes for this client
    await supabase
      .from("deletion_verification_codes")
      .delete()
      .eq("client_id", client_id);

    console.log(`Successfully deleted all data for client: ${client_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Cliente e todos os dados foram excluídos permanentemente" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in delete-client-data function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
