import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("EXPORT-DATABASE-DATA");

// Escape SQL string values
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return `ARRAY[]::text[]`;
    return `ARRAY[${value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : escapeSQLValue(v)).join(', ')}]::text[]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Starting data export", { userId: user.id });

    let dataSQL = `-- WebQ Database Data Export
-- Generated at: ${new Date().toISOString()}
-- Project: pyjfxrwgwncoasppgmuh

-- =====================================================
-- IMPORTANT: Execute this AFTER running schema.sql
-- Data is ordered by dependencies
-- =====================================================

`;

    const tablesInOrder = [
      'system_settings', 'system_email_templates', 'page_seo', 'home_content',
      'portfolio_items', 'media_files', 'design_service_categories', 'help_categories',
      'design_packages', 'help_articles', 'help_article_feedback', 'blog_posts',
      'profiles', 'user_roles', 'client_onboarding', 'client_projects',
      'project_credentials', 'project_files', 'project_tickets', 'ticket_messages',
      'timeline_messages', 'design_orders', 'design_deliveries', 'design_delivery_files',
      'design_feedback', 'migration_requests', 'migration_messages', 'user_subscriptions',
      'notifications', 'notification_queue', 'email_logs', 'action_logs',
    ];

    let totalRows = 0;

    for (const tableName of tablesInOrder) {
      log(`Exporting table: ${tableName}`);
      
      const { data, error } = await supabase.from(tableName).select('*').limit(10000);

      if (error) {
        log.error(`Error exporting ${tableName}`, { error: error.message });
        dataSQL += `-- ERROR exporting ${tableName}: ${error.message}\n\n`;
        continue;
      }

      if (!data || data.length === 0) {
        dataSQL += `-- Table ${tableName}: No data\n\n`;
        continue;
      }

      dataSQL += `-- =====================================================\n`;
      dataSQL += `-- Table: ${tableName} (${data.length} rows)\n`;
      dataSQL += `-- =====================================================\n\n`;

      const columns = Object.keys(data[0]);
      
      for (const row of data) {
        const values = columns.map(col => escapeSQLValue(row[col]));
        dataSQL += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }

      dataSQL += '\n';
      totalRows += data.length;
    }

    dataSQL += `
-- =====================================================
-- EXCLUDED TABLES (security/temporary data)
-- =====================================================
-- password_reset_tokens: Security tokens
-- deletion_verification_codes: Temporary codes
-- processed_webhook_events: Webhook dedup

-- Total rows exported: ${totalRows}
`;

    // Log the export
    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'export',
      entity_type: 'database_data',
      description: `Exported database data for migration (${totalRows} rows)`,
      metadata: { total_rows: totalRows, tables_count: tablesInOrder.length }
    });

    log("Data export completed", { totalRows });

    return new Response(dataSQL, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename=webq-data.sql',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error("Error exporting data", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
