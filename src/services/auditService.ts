import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActionType = 'create' | 'update' | 'delete' | 'status_change' | 'approve' | 'reject' | 'upload' | 'download' | 'send';

export type EntityType = 
  | 'project' 
  | 'ticket' 
  | 'design_order' 
  | 'file' 
  | 'credential' 
  | 'blog_post' 
  | 'page' 
  | 'settings' 
  | 'email' 
  | 'client'
  | 'help_article'
  | 'help_category'
  | 'email_template'
  | 'message'
  | 'media_file';

type JsonObject = { [key: string]: Json | undefined };

interface LogActionParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  description: string;
  oldValue?: JsonObject;
  newValue?: JsonObject;
  metadata?: JsonObject;
}

/**
 * Generic function to log an action to the audit trail
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[AuditService] No authenticated user, skipping log');
      return;
    }

    const { error } = await supabase
      .from('action_logs')
      .insert([{
        user_id: user.id,
        user_email: user.email || 'unknown',
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || null,
        description: params.description,
        old_value: (params.oldValue as Json) || null,
        new_value: (params.newValue as Json) || null,
        metadata: (params.metadata as Json) || {},
      }]);

    if (error) {
      console.error('[AuditService] Failed to log action:', error);
    }
  } catch (err) {
    console.error('[AuditService] Error logging action:', err);
  }
}

/**
 * Log project-related actions
 */
export async function logProjectAction(
  projectId: string,
  projectName: string,
  actionType: ActionType,
  description: string,
  details?: { oldValue?: JsonObject; newValue?: JsonObject; metadata?: JsonObject }
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'project',
    entityId: projectId,
    entityName: projectName,
    description,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    metadata: details?.metadata,
  });
}

/**
 * Log ticket-related actions
 */
export async function logTicketAction(
  ticketId: string,
  ticketTitle: string,
  actionType: ActionType,
  description: string,
  details?: { oldValue?: JsonObject; newValue?: JsonObject; metadata?: JsonObject }
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'ticket',
    entityId: ticketId,
    entityName: ticketTitle,
    description,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    metadata: details?.metadata,
  });
}

/**
 * Log design order-related actions
 */
export async function logDesignOrderAction(
  orderId: string,
  orderName: string,
  actionType: ActionType,
  description: string,
  details?: { oldValue?: JsonObject; newValue?: JsonObject; metadata?: JsonObject }
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'design_order',
    entityId: orderId,
    entityName: orderName,
    description,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    metadata: details?.metadata,
  });
}

/**
 * Log file-related actions
 */
export async function logFileAction(
  fileId: string,
  fileName: string,
  actionType: ActionType,
  description: string,
  metadata?: JsonObject
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'file',
    entityId: fileId,
    entityName: fileName,
    description,
    metadata,
  });
}

/**
 * Log settings changes
 */
export async function logSettingsChange(
  settingKey: string,
  description: string,
  oldValue?: Json,
  newValue?: Json
): Promise<void> {
  await logAction({
    actionType: 'update',
    entityType: 'settings',
    entityName: settingKey,
    description,
    oldValue: oldValue as JsonObject,
    newValue: newValue as JsonObject,
  });
}

/**
 * Log blog/page actions
 */
export async function logContentAction(
  contentId: string,
  contentTitle: string,
  isPage: boolean,
  actionType: ActionType,
  description: string,
  details?: { oldValue?: JsonObject; newValue?: JsonObject }
): Promise<void> {
  await logAction({
    actionType,
    entityType: isPage ? 'page' : 'blog_post',
    entityId: contentId,
    entityName: contentTitle,
    description,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
  });
}

/**
 * Log email actions
 */
export async function logEmailAction(
  emailId: string,
  subject: string,
  actionType: ActionType,
  description: string,
  metadata?: JsonObject
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'email',
    entityId: emailId,
    entityName: subject,
    description,
    metadata,
  });
}

/**
 * Log client-related actions
 */
export async function logClientAction(
  clientId: string,
  clientName: string,
  actionType: ActionType,
  description: string,
  details?: { oldValue?: JsonObject; newValue?: JsonObject; metadata?: JsonObject }
): Promise<void> {
  await logAction({
    actionType,
    entityType: 'client',
    entityId: clientId,
    entityName: clientName,
    description,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    metadata: details?.metadata,
  });
}
