import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("DOWNLOAD-CLIENT-DATA");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabaseAdmin, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin authenticated", { adminEmail: user.email });

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Starting data export", { clientId: client_id });

    // Fetch all client data
    const [onboardingResult, projectsResult, profileResult] = await Promise.all([
      supabaseAdmin.from("client_onboarding").select("*").eq("user_id", client_id).single(),
      supabaseAdmin.from("client_projects").select("*").eq("client_id", client_id),
      supabaseAdmin.from("profiles").select("*").eq("user_id", client_id).single(),
    ]);

    const onboarding = onboardingResult.data;
    const projects = projectsResult.data || [];
    const profile = profileResult.data;

    // Fetch project-related data
    const projectIds = projects.map((p: { id: string }) => p.id);
    
    let credentials: any[] = [];
    let files: any[] = [];
    let tickets: any[] = [];
    let ticketMessages: any[] = [];
    let notifications: any[] = [];

    if (projectIds.length > 0) {
      const [credentialsResult, filesResult, ticketsResult, notificationsResult] = await Promise.all([
        supabaseAdmin.from("project_credentials").select("*").in("project_id", projectIds),
        supabaseAdmin.from("project_files").select("*").in("project_id", projectIds),
        supabaseAdmin.from("project_tickets").select("*").in("project_id", projectIds),
        supabaseAdmin.from("notifications").select("*").eq("user_id", client_id),
      ]);

      credentials = credentialsResult.data || [];
      files = filesResult.data || [];
      tickets = ticketsResult.data || [];
      notifications = notificationsResult.data || [];

      if (tickets.length > 0) {
        const ticketIds = tickets.map((t: { id: string }) => t.id);
        const messagesResult = await supabaseAdmin.from("ticket_messages").select("*").in("ticket_id", ticketIds);
        ticketMessages = messagesResult.data || [];
      }
    }

    // Generate text content
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    let textContent = `=====================================
EXPORTAÇÃO DE DADOS DO CLIENTE
Data: ${now}
Exportado por: ${user.email}
=====================================

`;

    // Profile info
    textContent += `=== PERFIL DO USUÁRIO ===
Nome: ${profile?.full_name || "Não informado"}
Empresa: ${profile?.company_name || "Não informada"}
Telefone: ${profile?.phone || "Não informado"}
ID do usuário: ${client_id}
Criado em: ${profile?.created_at ? new Date(profile.created_at).toLocaleString("pt-BR") : "N/A"}

`;

    // Onboarding data
    if (onboarding) {
      textContent += `=== DADOS DE ONBOARDING ===
Nome da Empresa: ${onboarding.company_name}
Tipo de Negócio: ${onboarding.business_type}
Descrição: ${onboarding.business_description || "Não informada"}
WhatsApp: ${onboarding.whatsapp}
Instagram: ${onboarding.instagram || "Não informado"}
Plano Selecionado: ${onboarding.selected_plan}
Tem Domínio: ${onboarding.has_domain ? "Sim" : "Não"}
Domínio: ${onboarding.domain_name || "Não informado"}
Tem Logo: ${onboarding.has_logo ? "Sim" : "Não"}
Precisa Criar Marca: ${onboarding.needs_brand_creation ? "Sim" : "Não"}
Pagou Criação de Marca: ${onboarding.brand_creation_paid ? "Sim" : "Não"}
Cor Preferida: ${onboarding.preferred_color || "Não informada"}
Descrição do Logo: ${onboarding.logo_description || "Não informada"}
URL do Logo: ${onboarding.logo_url || "Não informado"}
URLs de Inspiração: ${onboarding.inspiration_urls?.join(", ") || "Nenhuma"}
Stripe Session ID: ${onboarding.stripe_session_id || "N/A"}
Criado em: ${new Date(onboarding.created_at).toLocaleString("pt-BR")}
Atualizado em: ${new Date(onboarding.updated_at).toLocaleString("pt-BR")}

`;
    }

    // Projects
    textContent += `=== PROJETOS (${projects.length}) ===\n`;
    for (const project of projects) {
      textContent += `
[Projeto: ${project.name}]
ID: ${project.id}
Status: ${project.status}
Plano: ${project.plan || "N/A"}
Domínio: ${project.domain || "Não configurado"}
Notas: ${project.notes || "Nenhuma"}
Criado em: ${new Date(project.created_at).toLocaleString("pt-BR")}
Atualizado em: ${new Date(project.updated_at).toLocaleString("pt-BR")}
`;
    }

    // Credentials
    textContent += `\n=== CREDENCIAIS (${credentials.length}) ===\n`;
    for (const cred of credentials) {
      textContent += `
[${cred.label}]
Tipo: ${cred.credential_type}
URL: ${cred.url || "N/A"}
Usuário: ${cred.username || "N/A"}
Senha: ${cred.password || "N/A"}
Notas: ${cred.notes || "Nenhuma"}
Criado em: ${new Date(cred.created_at).toLocaleString("pt-BR")}
`;
    }

    // Files list
    textContent += `\n=== ARQUIVOS (${files.length}) ===\n`;
    for (const file of files) {
      textContent += `
- ${file.file_name}
  Tipo: ${file.file_type || "N/A"}
  URL: ${file.file_url}
  Descrição: ${file.description || "Nenhuma"}
  Enviado em: ${new Date(file.created_at).toLocaleString("pt-BR")}
`;
    }

    // Tickets
    textContent += `\n=== TICKETS (${tickets.length}) ===\n`;
    for (const ticket of tickets) {
      const messages = ticketMessages.filter(m => m.ticket_id === ticket.id);
      textContent += `
[Ticket #${ticket.id.slice(0, 8)}]
Título: ${ticket.title}
Descrição: ${ticket.description || "Nenhuma"}
Status: ${ticket.status}
Prioridade: ${ticket.priority}
Criado em: ${new Date(ticket.created_at).toLocaleString("pt-BR")}
Resolvido em: ${ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString("pt-BR") : "N/A"}

Mensagens (${messages.length}):
`;
      for (const msg of messages) {
        textContent += `  - [${new Date(msg.created_at).toLocaleString("pt-BR")}] ${msg.message}\n`;
      }
    }

    // Notifications
    textContent += `\n=== NOTIFICAÇÕES (${notifications.length}) ===\n`;
    for (const notif of notifications) {
      textContent += `
- [${new Date(notif.created_at).toLocaleString("pt-BR")}] ${notif.title}
  Mensagem: ${notif.message || "N/A"}
  Tipo: ${notif.type}
  Lida: ${notif.read ? "Sim" : "Não"}
`;
    }

    // Create ZIP file structure
    const zipFiles: Record<string, Uint8Array> = {
      "dados-cliente.txt": strToU8(textContent),
    };

    // Download and add actual files from storage
    for (const file of files) {
      try {
        const response = await fetch(file.file_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          zipFiles[`arquivos/${file.file_name}`] = new Uint8Array(arrayBuffer);
        }
      } catch (err) {
        log.error(`Error downloading file ${file.file_name}`, err);
      }
    }

    // Download logo if exists
    if (onboarding?.logo_url) {
      try {
        const response = await fetch(onboarding.logo_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const ext = onboarding.logo_url.split('.').pop() || 'png';
          zipFiles[`logo.${ext}`] = new Uint8Array(arrayBuffer);
        }
      } catch (err) {
        log.error("Error downloading logo", err);
      }
    }

    // Download inspiration images
    if (onboarding?.inspiration_urls) {
      for (let i = 0; i < onboarding.inspiration_urls.length; i++) {
        try {
          const url = onboarding.inspiration_urls[i];
          const response = await fetch(url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const ext = url.split('.').pop()?.split('?')[0] || 'png';
            zipFiles[`inspiracao/inspiracao-${i + 1}.${ext}`] = new Uint8Array(arrayBuffer);
          }
        } catch (err) {
          log.error(`Error downloading inspiration image ${i}`, err);
        }
      }
    }

    // Generate ZIP using fflate
    const zipped = zipSync(zipFiles);
    const zipBuffer = new Uint8Array(zipped).buffer as ArrayBuffer;
    
    const clientName = onboarding?.company_name || profile?.full_name || client_id.slice(0, 8);
    const safeFileName = clientName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    log("Export completed", { clientId: client_id, adminEmail: user.email });

    return new Response(zipBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="dados-${safeFileName}-${Date.now()}.zip"`,
      },
    });
  } catch (error: any) {
    log.error("Error in function", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
