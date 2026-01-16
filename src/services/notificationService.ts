import { supabase } from "@/integrations/supabase/client";

// Production URL constant - use this instead of window.location.origin for emails
const PRODUCTION_URL = "https://webq.com.br";

interface CreateNotificationParams {
  userId: string;
  type: "new_ticket" | "ticket_response" | "ticket_status_change" | "new_file" | "project_update" | "brand_delivery" | "admin_message" | "design_order" | "migration_request";
  title: string;
  message?: string;
  referenceId?: string;
  referenceType?: "ticket" | "file" | "project" | "brand" | "timeline_message" | "design_order" | "migration";
}

interface QueueEmailParams {
  templateSlug: string;
  recipients: string[];
  variables: Record<string, string>;
  dedupKey?: string;
  metadata?: Record<string, any>;
}

// Queue email for reliable delivery via notification_queue table
// This ensures emails are sent even if the browser closes
async function queueEmail({
  templateSlug,
  recipients,
  variables,
  dedupKey,
  metadata = {}
}: QueueEmailParams): Promise<boolean> {
  console.log(`[EMAIL-QUEUE] Queueing ${templateSlug} for:`, recipients);
  
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("notification_queue").insert({
      template_slug: templateSlug,
      recipients,
      variables,
      dedup_key: dedupKey,
      metadata,
      created_by: user?.user?.id || null
    });

    if (error) {
      console.error(`[EMAIL-QUEUE] Failed to queue ${templateSlug}:`, error);
      // Fallback to direct send if queue fails
      return await sendEmailDirect(templateSlug, recipients, variables, dedupKey);
    }
    
    console.log(`[EMAIL-QUEUE] Successfully queued ${templateSlug}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL-QUEUE] Exception queueing ${templateSlug}:`, error);
    // Fallback to direct send
    return await sendEmailDirect(templateSlug, recipients, variables, dedupKey);
  }
}

// Direct email send (fallback if queue fails, or for immediate sends)
async function sendEmailDirect(
  templateSlug: string,
  to: string[],
  variables: Record<string, string>,
  dedupKey?: string
): Promise<boolean> {
  console.log(`[EMAIL-DIRECT] Sending ${templateSlug} to:`, to);
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        template_slug: templateSlug,
        to,
        variables,
        triggered_by: "app",
        metadata: dedupKey ? { dedup_key: dedupKey } : {},
      },
    });
    if (error) {
      console.error(`[EMAIL-DIRECT] Failed to send ${templateSlug}:`, error);
      return false;
    }
    console.log(`[EMAIL-DIRECT] Successfully sent ${templateSlug}:`, data);
    return true;
  } catch (error) {
    console.error(`[EMAIL-DIRECT] Exception sending ${templateSlug}:`, error);
    return false;
  }
}

// Helper to send email via queue (preferred) with automatic dedup key generation
async function sendEmailInternal(
  templateSlug: string,
  to: string[],
  variables: Record<string, string>,
  triggeredBy: string = "app",
  referenceId?: string
) {
  // Generate dedup key from template + recipients + reference
  const dedupKey = referenceId 
    ? `${templateSlug}:${to.sort().join(',')}:${referenceId}`
    : undefined;
  
  await queueEmail({
    templateSlug,
    recipients: to,
    variables,
    dedupKey,
    metadata: { triggered_by: triggeredBy, reference_id: referenceId }
  });
}

// Helper to get client name
async function getClientName(clientId: string): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", clientId)
      .single();
    
    if (profile?.full_name) return profile.full_name;
    if (profile?.company_name) return profile.company_name;
    
    const { data: onboarding } = await supabase
      .from("client_onboarding")
      .select("company_name")
      .eq("user_id", clientId)
      .single();
    
    return onboarding?.company_name || "Cliente";
  } catch {
    return "Cliente";
  }
}

// Helper to get all admin user IDs using security definer function (bypasses RLS)
async function getAllAdminIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_admin_user_ids');
    
    if (error) {
      console.error('[NOTIFY] Error getting admin IDs:', error);
      return [];
    }
    
    console.log('[NOTIFY] Admin IDs from RPC:', data);
    return data || [];
  } catch (err) {
    console.error('[NOTIFY] Exception getting admin IDs:', err);
    return [];
  }
}

// OPTIMIZED: Create a single notification
export async function createNotification({
  userId,
  type,
  title,
  message,
  referenceId,
  referenceType,
}: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message: message || null,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// OPTIMIZED: Batch insert multiple notifications at once
export async function createNotificationsBatch(
  notifications: Array<{
    userId: string;
    type: CreateNotificationParams["type"];
    title: string;
    message?: string;
    referenceId?: string;
    referenceType?: CreateNotificationParams["referenceType"];
  }>
) {
  if (notifications.length === 0) return;

  const records = notifications.map(n => ({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    message: n.message || null,
    reference_id: n.referenceId || null,
    reference_type: n.referenceType || null,
  }));

  const { error } = await supabase.from("notifications").insert(records);

  if (error) {
    console.error("Error creating batch notifications:", error);
    throw error;
  }
}

// Helper to notify client when admin responds to a ticket
export async function notifyTicketResponse(
  clientId: string,
  ticketTitle: string,
  ticketId: string,
  projectId: string,
  responsePreview?: string
) {
  const clientName = await getClientName(clientId);
  
  await createNotification({
    userId: clientId,
    type: "ticket_response",
    title: `Nova resposta no ticket "${ticketTitle}"`,
    message: "A equipe WebQ respondeu ao seu ticket.",
    referenceId: ticketId,
    referenceType: "ticket",
  });

  const ticketUrl = `${PRODUCTION_URL}/cliente/projeto/${projectId}/tickets?ticket=${ticketId}`;
  await sendEmailInternal("ticket_response", [clientId], {
    client_name: clientName,
    ticket_id: ticketId.substring(0, 8),
    ticket_title: ticketTitle,
    response_preview: responsePreview || "Clique para ver a resposta completa.",
    ticket_url: ticketUrl,
  }, "app", ticketId);
}

// Helper to notify client when ticket status changes
export async function notifyTicketStatusChange(
  clientId: string,
  ticketTitle: string,
  newStatus: string,
  ticketId: string,
  projectId: string
) {
  const clientName = await getClientName(clientId);
  
  const statusLabels: Record<string, string> = {
    open: "aberto",
    in_progress: "em andamento",
    resolved: "resolvido",
    closed: "fechado",
  };

  await createNotification({
    userId: clientId,
    type: "ticket_status_change",
    title: `Status do ticket atualizado`,
    message: `O ticket "${ticketTitle}" agora está ${statusLabels[newStatus] || newStatus}.`,
    referenceId: ticketId,
    referenceType: "ticket",
  });

  if (newStatus === "resolved") {
    const ticketUrl = `${PRODUCTION_URL}/cliente/projeto/${projectId}/tickets?ticket=${ticketId}`;
    await sendEmailInternal("ticket_resolved", [clientId], {
      client_name: clientName,
      ticket_id: ticketId.substring(0, 8),
      ticket_title: ticketTitle,
      ticket_url: ticketUrl,
    }, "app", ticketId);
  }
}

// Helper to notify admin when client creates a new ticket
export async function notifyNewTicket(
  adminId: string,
  companyName: string,
  ticketTitle: string,
  ticketId: string,
  projectName?: string,
  projectId?: string
) {
  await createNotification({
    userId: adminId,
    type: "new_ticket",
    title: `Novo ticket de ${companyName}`,
    message: ticketTitle,
    referenceId: ticketId,
    referenceType: "ticket",
  });

  const ticketUrl = projectId 
    ? `${PRODUCTION_URL}/admin/projects/${projectId}?tab=tickets&ticket=${ticketId}`
    : `${PRODUCTION_URL}/admin/tickets`;
  await sendEmailInternal("ticket_created", [adminId], {
    client_name: companyName,
    ticket_id: ticketId.substring(0, 8),
    ticket_title: ticketTitle,
    project_name: projectName || companyName,
    ticket_url: ticketUrl,
  }, "app", ticketId);
}

// OPTIMIZED: Notify all admins with batch insert
export async function notifyAllAdminsNewTicket(
  clientName: string,
  companyName: string,
  ticketTitle: string,
  ticketId: string,
  projectName: string,
  projectId: string
) {
  console.log(`[NOTIFY] notifyAllAdminsNewTicket called:`, { clientName, companyName, ticketTitle, ticketId, projectName, projectId });
  const adminIds = await getAllAdminIds();
  console.log(`[NOTIFY] Found admin IDs:`, adminIds);
  
  // OPTIMIZED: Batch insert all notifications at once
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "new_ticket" as const,
        title: `Novo ticket de ${companyName}`,
        message: ticketTitle,
        referenceId: ticketId,
        referenceType: "ticket" as const,
      }))
    );
  }
  
  // Send email to all admins
  if (adminIds.length > 0) {
    console.log(`[NOTIFY] Sending email to admins...`);
    const ticketUrl = `${PRODUCTION_URL}/admin/projects/${projectId}?tab=tickets&ticket=${ticketId}`;
    await sendEmailInternal("ticket_created", adminIds, {
      client_name: clientName,
      ticket_id: ticketId.substring(0, 8),
      ticket_title: ticketTitle,
      project_name: projectName,
      ticket_url: ticketUrl,
    }, "app", ticketId);
  }
}

// Helper to notify admin when client sends a message
export async function notifyClientMessage(
  adminId: string,
  companyName: string,
  ticketTitle: string,
  ticketId: string
) {
  await createNotification({
    userId: adminId,
    type: "ticket_response",
    title: `Nova mensagem de ${companyName}`,
    message: `Mensagem no ticket "${ticketTitle}"`,
    referenceId: ticketId,
    referenceType: "ticket",
  });
}

// OPTIMIZED: Notify all admins with batch insert
export async function notifyAllAdminsClientMessage(
  companyName: string,
  ticketTitle: string,
  ticketId: string
) {
  const adminIds = await getAllAdminIds();
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "ticket_response" as const,
        title: `Nova mensagem de ${companyName}`,
        message: `Mensagem no ticket "${ticketTitle}"`,
        referenceId: ticketId,
        referenceType: "ticket" as const,
      }))
    );
  }
}

// Helper to notify client when admin uploads a new file
export async function notifyClientNewFile(
  clientId: string,
  fileName: string,
  projectId: string,
  projectName: string,
  fileType?: string
) {
  const clientName = await getClientName(clientId);
  const fileUrl = `${PRODUCTION_URL}/cliente/projeto/${projectId}/arquivos`;
  
  await createNotification({
    userId: clientId,
    type: "new_file",
    title: "Novo arquivo disponível",
    message: `O arquivo "${fileName}" foi adicionado ao seu projeto.`,
    referenceId: projectId,
    referenceType: "file",
  });

  await sendEmailInternal("file_uploaded", [clientId], {
    client_name: clientName,
    project_name: projectName,
    file_name: fileName,
    file_type: fileType || "Documento",
    file_url: fileUrl,
  }, "app", projectId);
}

// OPTIMIZED: Notify admins with batch insert
export async function notifyNewFile(
  projectId: string,
  projectName: string,
  fileName: string,
  clientName: string,
  fileType?: string
) {
  const adminIds = await getAllAdminIds();
  const fileUrl = `${PRODUCTION_URL}/admin/projects/${projectId}?tab=files`;

  if (adminIds.length > 0) {
    // Batch insert notifications
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "new_file" as const,
        title: `Novo arquivo enviado`,
        message: `O cliente enviou "${fileName}" para o projeto ${projectName}.`,
        referenceId: projectId,
        referenceType: "file" as const,
      }))
    );

    await sendEmailInternal("file_uploaded", adminIds, {
      client_name: clientName,
      project_name: projectName,
      file_name: fileName,
      file_type: fileType || "Documento",
      file_url: fileUrl,
    }, "app", projectId);
  }
}

// Helper to notify client when project status changes
export async function notifyProjectStatusUpdate(
  clientId: string,
  projectId: string,
  projectName: string,
  newStatus: string,
  domainUrl?: string
) {
  const clientName = await getClientName(clientId);
  const dashboardUrl = `${PRODUCTION_URL}/cliente/dashboard`;
  
  const statusLabels: Record<string, string> = {
    online: "online",
    development: "em desenvolvimento",
    maintenance: "em manutenção",
    suspended: "suspenso",
  };

  await createNotification({
    userId: clientId,
    type: "project_update",
    title: `Status do projeto atualizado`,
    message: `O projeto "${projectName}" agora está ${statusLabels[newStatus] || newStatus}.`,
    referenceId: projectId,
    referenceType: "project",
  });

  await sendEmailInternal("project_status_update", [clientId], {
    client_name: clientName,
    project_name: projectName,
    new_status: statusLabels[newStatus] || newStatus,
    dashboard_url: dashboardUrl,
  }, "app", projectId);

  if (newStatus === "online" && domainUrl) {
    const today = new Date().toLocaleDateString("pt-BR");
    await sendEmailInternal("project_completed", [clientId], {
      client_name: clientName,
      site_url: domainUrl,
      delivery_date: today,
      review_url: "https://g.page/r/webq/review",
    }, "app", projectId);
  }
}

// Helper to notify client when brand version is ready
export async function notifyBrandDelivery(
  clientId: string,
  companyName: string,
  versionNumber: number
) {
  const clientName = await getClientName(clientId);
  const feedbackUrl = `${PRODUCTION_URL}/cliente/design`;
  
  await createNotification({
    userId: clientId,
    type: "brand_delivery",
    title: `Nova versão da sua marca disponível!`,
    message: `A versão ${versionNumber} está pronta para revisão.`,
    referenceType: "brand",
  });

  await sendEmailInternal("brand_feedback_request", [clientId], {
    client_name: clientName,
    company_name: companyName,
    feedback_url: feedbackUrl,
  }, "app", clientId);
}

// OPTIMIZED: Notify admins with batch insert
export async function notifyBrandRevisionRequested(
  clientName: string,
  companyName: string,
  versionNumber: number,
  comment: string
) {
  const adminIds = await getAllAdminIds();
  const adminUrl = `${PRODUCTION_URL}/admin/design`;
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "project_update" as const,
        title: `${companyName} solicitou revisão`,
        message: `Versão ${versionNumber}: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`,
        referenceType: "brand" as const,
      }))
    );
    
    await sendEmailInternal("brand_revision_requested", adminIds, {
      client_name: clientName,
      company_name: companyName,
      version_number: versionNumber.toString(),
      comment: comment,
      admin_url: adminUrl,
    }, "app", `brand-revision-${versionNumber}`);
  }
}

// OPTIMIZED: Notify admins with batch insert
export async function notifyBrandApproved(
  clientName: string,
  companyName: string
) {
  const adminIds = await getAllAdminIds();
  const downloadUrl = `${PRODUCTION_URL}/admin/design`;
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "project_update" as const,
        title: `${companyName} aprovou a marca!`,
        message: `O cliente ${clientName} aprovou a identidade visual.`,
        referenceType: "brand" as const,
      }))
    );

    await sendEmailInternal("brand_approved", adminIds, {
      client_name: clientName,
      company_name: companyName,
      download_url: downloadUrl,
    }, "app", `brand-approved-${companyName}`);
  }
}

// Helper to send welcome email to new client
export async function sendWelcomeEmail(
  clientId: string,
  clientName: string,
  companyName: string,
  planName: string
) {
  await sendEmailInternal("welcome_client", [clientId], {
    client_name: clientName,
    company_name: companyName,
    plan_name: planName,
  }, "app", clientId);
}

// OPTIMIZED: Notify admins about new signup (design-only clients)
export async function notifyNewSignup(
  userId: string,
  clientName: string,
  email: string,
  companyName?: string,
  whatsapp?: string
) {
  const adminIds = await getAllAdminIds();
  const dashboardUrl = `${PRODUCTION_URL}/admin/clients`;
  const plansUrl = `${PRODUCTION_URL}/planos`;
  const migrationUrl = `${PRODUCTION_URL}/migracao`;
  
  if (adminIds.length > 0) {
    // Batch insert notifications
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "project_update" as const,
        title: `Novo cadastro: ${clientName}`,
        message: companyName 
          ? `${companyName} - Cadastro design-only`
          : `Cliente design-only cadastrado`,
        referenceId: userId,
        referenceType: "project" as const,
      }))
    );

    // Send email to admins
    await sendEmailInternal("new_signup_admin", adminIds, {
      client_name: clientName,
      client_email: email,
      company_name: companyName || "Não informado",
      whatsapp: whatsapp || "Não informado",
      dashboard_url: dashboardUrl,
    }, "app", userId);
  }

  // Send welcome email to new client
  await sendEmailInternal("welcome_signup", [userId], {
    client_name: clientName,
    dashboard_url: `${PRODUCTION_URL}/cliente/dashboard`,
    plans_url: plansUrl,
    migration_url: migrationUrl,
  }, "app", userId);
}

// Helper to notify client when admin sends a direct message
export async function notifyAdminMessage(
  clientId: string,
  projectId: string,
  projectName: string,
  messageContent: string,
  messageType: string = "info"
) {
  const clientName = await getClientName(clientId);
  const dashboardUrl = `${PRODUCTION_URL}/cliente/dashboard`;
  
  // Get current admin user
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id || null;
  
  // Insert message into timeline_messages table
  const { error: insertError } = await supabase.from("timeline_messages").insert({
    client_id: clientId,
    project_id: projectId,
    message: messageContent,
    message_type: messageType,
    sender_type: "admin",
    admin_id: adminId,
  });
  
  if (insertError) {
    console.error("[NOTIFY] Error inserting timeline message:", insertError);
    throw insertError;
  }
  
  // Create notification
  await createNotification({
    userId: clientId,
    type: "admin_message",
    title: "Nova mensagem da WebQ",
    message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
    referenceId: projectId,
    referenceType: "timeline_message",
  });

  // Send email with correct variable name matching template
  await sendEmailInternal("admin_message", [clientId], {
    client_name: clientName,
    project_name: projectName,
    message: messageContent,
    dashboard_url: dashboardUrl,
  }, "app", projectId);
}

// OPTIMIZED: Notify admins about design order with batch insert
export async function notifyDesignOrderCreated(
  clientId: string,
  clientName: string,
  companyName: string,
  orderId: string,
  packageName: string
) {
  const adminIds = await getAllAdminIds();
  const orderUrl = `${PRODUCTION_URL}/admin/design/${orderId}`;
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "design_order" as const,
        title: `Novo pedido de design de ${companyName}`,
        message: packageName,
        referenceId: orderId,
        referenceType: "design_order" as const,
      }))
    );

    await sendEmailInternal("design_order_created_admin", adminIds, {
      client_name: clientName,
      company_name: companyName,
      package_name: packageName,
      order_url: orderUrl,
    }, "app", orderId);
  }
}

// OPTIMIZED: Notify admins about revision request with batch insert
export async function notifyDesignRevisionRequested(
  clientName: string,
  companyName: string,
  orderId: string,
  packageName: string,
  comment: string
) {
  const adminIds = await getAllAdminIds();
  const orderUrl = `${PRODUCTION_URL}/admin/design/${orderId}`;
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "design_order" as const,
        title: `${companyName} solicitou revisão`,
        message: `${packageName}: ${comment.substring(0, 80)}${comment.length > 80 ? '...' : ''}`,
        referenceId: orderId,
        referenceType: "design_order" as const,
      }))
    );

    await sendEmailInternal("design_order_revision_requested", adminIds, {
      client_name: clientName,
      company_name: companyName,
      package_name: packageName,
      comment: comment,
      order_url: orderUrl,
    }, "app", orderId);
  }
}

// Helper to get delivery label based on version
function getDeliveryLabel(versionNumber: number): string {
  if (versionNumber <= 3) {
    return `Versão ${versionNumber}`;
  } else if (versionNumber === 4) {
    return 'Bônus - Entrega Final';
  } else if (versionNumber === 5) {
    return 'Bônus Extra';
  } else if (versionNumber >= 6) {
    return 'Finalizado';
  }
  return `Versão ${versionNumber}`;
}

// Helper to notify client when design delivery is ready
export async function notifyDesignDelivery(
  clientId: string,
  companyName: string,
  orderId: string,
  packageName: string,
  versionNumber: number
) {
  const clientName = await getClientName(clientId);
  const orderUrl = `${PRODUCTION_URL}/cliente/design/${orderId}`;
  const deliveryLabel = getDeliveryLabel(versionNumber);
  
  // Determine notification title based on version
  let notificationTitle = `Nova versão disponível!`;
  let notificationMessage = `${deliveryLabel} de "${packageName}" está pronta para revisão.`;
  let emailTemplate = "design_order_delivered";
  
  if (versionNumber === 4) {
    notificationTitle = `🎁 Entrega bônus disponível!`;
    notificationMessage = `Bônus Final de "${packageName}" está disponível.`;
    emailTemplate = "design_order_bonus_delivered";
  } else if (versionNumber === 5) {
    notificationTitle = `🎁 Entrega bônus extra disponível!`;
    notificationMessage = `Bônus Extra de "${packageName}" está disponível.`;
    emailTemplate = "design_order_bonus_delivered";
  } else if (versionNumber >= 6) {
    notificationTitle = `🎉 Pedido finalizado!`;
    notificationMessage = `O pedido "${packageName}" foi concluído com sucesso.`;
    emailTemplate = "design_order_final_delivered";
  }
  
  await createNotification({
    userId: clientId,
    type: "design_order",
    title: notificationTitle,
    message: notificationMessage,
    referenceId: orderId,
    referenceType: "design_order",
  });

  await sendEmailInternal(emailTemplate, [clientId], {
    client_name: clientName,
    company_name: companyName,
    package_name: packageName,
    version_number: versionNumber.toString(),
    version_label: deliveryLabel,
    order_url: orderUrl,
  }, "app", orderId);
}

// Helper to notify client when hosting data is ready
export async function notifyHostingDataReady(
  clientId: string,
  projectId: string,
  projectName: string
) {
  const clientName = await getClientName(clientId);
  const settingsUrl = `${PRODUCTION_URL}/cliente/projeto/${projectId}/configuracoes`;
  
  await createNotification({
    userId: clientId,
    type: "project_update",
    title: "Dados de hospedagem disponíveis",
    message: `Os dados de acesso do projeto "${projectName}" foram configurados.`,
    referenceId: projectId,
    referenceType: "project",
  });

  await sendEmailInternal("hosting_data_ready", [clientId], {
    client_name: clientName,
    project_name: projectName,
    settings_url: settingsUrl,
  }, "app", projectId);
}

// Helper to notify domain status change
export async function notifyDomainStatusChange(
  clientId: string,
  projectId: string,
  projectName: string,
  newStatus: string,
  domainUrl?: string,
  includeHostingData?: boolean
) {
  const clientName = await getClientName(clientId);
  const dashboardUrl = `${PRODUCTION_URL}/cliente/dashboard`;
  
  const statusLabels: Record<string, string> = {
    needs_registration: "aguardando registro",
    pending_dns: "aguardando apontamento DNS",
    pointed: "apontado",
    active: "ativo",
  };

  await createNotification({
    userId: clientId,
    type: "project_update",
    title: `Status do domínio atualizado`,
    message: `O domínio do projeto "${projectName}" agora está ${statusLabels[newStatus] || newStatus}.`,
    referenceId: projectId,
    referenceType: "project",
  });

  // If domain is pointed/active and hosting data should be sent
  if ((newStatus === "pointed" || newStatus === "active") && includeHostingData) {
    await notifyHostingDataReady(clientId, projectId, projectName);
  }
}

// Helper to notify design order delivered
export async function notifyDesignOrderDelivered(
  clientId: string,
  companyName: string,
  orderId: string,
  packageName: string,
  versionNumber: number
) {
  await notifyDesignDelivery(clientId, companyName, orderId, packageName, versionNumber);
}

// Alias for backward compatibility
export async function notifyDesignOrderApproved(
  clientName: string,
  companyName: string,
  orderId: string,
  packageName: string
) {
  const adminIds = await getAllAdminIds();
  const orderUrl = `${PRODUCTION_URL}/admin/design/${orderId}`;
  
  if (adminIds.length > 0) {
    await createNotificationsBatch(
      adminIds.map(adminId => ({
        userId: adminId,
        type: "design_order" as const,
        title: `${companyName} aprovou o design!`,
        message: `O cliente aprovou "${packageName}".`,
        referenceId: orderId,
        referenceType: "design_order" as const,
      }))
    );

    await sendEmailInternal("design_order_approved", adminIds, {
      client_name: clientName,
      company_name: companyName,
      package_name: packageName,
      order_url: orderUrl,
    }, "app", orderId);
  }
}

// Alias for backward compatibility
export async function notifyDesignOrderRevisionRequested(
  clientName: string,
  companyName: string,
  orderId: string,
  packageName: string,
  comment: string
) {
  await notifyDesignRevisionRequested(clientName, companyName, orderId, packageName, comment);
}

// Helper to notify admin message (with variable args for backward compat)
export async function notifyAdminMessageLegacy(
  clientId: string,
  projectId: string,
  projectName: string,
  messagePreview: string,
  _messageType?: string,
  _adminId?: string
) {
  await notifyAdminMessage(clientId, projectId, projectName, messagePreview);
}

// Notify admins when a client sends a timeline message
export async function notifyClientTimelineMessage(
  clientId: string,
  messagePreview: string,
  messageId: string
) {
  const clientName = await getClientName(clientId);
  const adminIds = await getAllAdminIds();
  
  if (adminIds.length === 0) {
    console.log("[NOTIFY] No admins to notify for client timeline message");
    return;
  }

  // Truncate message for preview
  const preview = messagePreview.length > 100 
    ? messagePreview.substring(0, 100) + "..." 
    : messagePreview;

  await createNotificationsBatch(
    adminIds.map(adminId => ({
      userId: adminId,
      type: "admin_message" as const,
      title: `Nova mensagem de ${clientName}`,
      message: preview,
      referenceId: messageId,
      referenceType: "timeline_message" as const,
    }))
  );

  // Send email notification to all admins
  await sendEmailInternal("client_message_received", adminIds, {
    client_name: clientName,
    message_content: messagePreview,
    dashboard_url: `${PRODUCTION_URL}/admin/clients`,
  }, "app", messageId);

  console.log(`[NOTIFY] Notified ${adminIds.length} admins about client timeline message`);
}

// Notify all admins when a migration is requested during onboarding
export async function notifyAllAdminsMigrationRequest(
  clientName: string,
  companyName: string,
  currentDomain: string,
  migrationId: string,
  siteType?: string,
  assistanceLevel?: string
) {
  console.log(`[NOTIFY] notifyAllAdminsMigrationRequest called:`, { clientName, companyName, currentDomain, migrationId });
  const adminIds = await getAllAdminIds();
  console.log(`[NOTIFY] Found admin IDs for migration:`, adminIds);
  
  if (adminIds.length === 0) {
    console.log("[NOTIFY] No admins to notify for migration request");
    return;
  }

  const siteTypeLabels: Record<string, string> = {
    wordpress: "WordPress",
    html: "HTML/CSS",
    wix: "Wix",
    squarespace: "Squarespace",
    ecommerce: "E-commerce",
    outro: "Outro",
  };

  const assistanceLevels: Record<string, string> = {
    full: "Assistência completa",
    partial: "Cliente fornece credenciais",
  };

  const description = `${companyName} - ${currentDomain} (${siteTypeLabels[siteType || "outro"] || siteType})`;
  
  // Batch insert all notifications
  await createNotificationsBatch(
    adminIds.map(adminId => ({
      userId: adminId,
      type: "migration_request" as const,
      title: `Nova solicitação de migração`,
      message: description,
      referenceId: migrationId,
      referenceType: "migration" as const,
    }))
  );

  // Send email to all admins
  const migrationUrl = `${PRODUCTION_URL}/admin/migrations`;
  await sendEmailInternal("migration_requested", adminIds, {
    client_name: clientName,
    company_name: companyName,
    current_domain: currentDomain,
    site_type: siteTypeLabels[siteType || "outro"] || siteType || "Não informado",
    assistance_level: assistanceLevels[assistanceLevel || "full"] || assistanceLevel || "Assistência completa",
    migration_url: migrationUrl,
  }, "app", migrationId);

  console.log(`[NOTIFY] Notified ${adminIds.length} admins about migration request`);
}
