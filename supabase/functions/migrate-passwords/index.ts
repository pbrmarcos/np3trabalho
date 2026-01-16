import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("MIGRATE-PASSWORDS");

const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(plaintext)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

function isEncrypted(value: string): boolean {
  if (!value) return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return value.length >= 44 && base64Regex.test(value);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin verified", { userId: user.id });

    const results = {
      project_credentials: { migrated: 0, skipped: 0, errors: 0 },
      client_projects: { migrated: 0, skipped: 0, errors: 0 },
    };

    // Migrate project_credentials passwords
    const { data: credentials } = await supabase
      .from("project_credentials")
      .select("id, password")
      .not("password", "is", null);

    if (credentials) {
      for (const cred of credentials) {
        if (!cred.password) {
          results.project_credentials.skipped++;
          continue;
        }

        if (isEncrypted(cred.password)) {
          results.project_credentials.skipped++;
          continue;
        }

        try {
          const encrypted = await encrypt(cred.password);
          const { error } = await supabase
            .from("project_credentials")
            .update({ password: encrypted })
            .eq("id", cred.id);

          if (error) {
            log.error("Error updating credential", { error: error.message });
            results.project_credentials.errors++;
          } else {
            results.project_credentials.migrated++;
          }
        } catch (e) {
          log.error("Encryption error", { error: e instanceof Error ? e.message : 'Unknown' });
          results.project_credentials.errors++;
        }
      }
    }

    // Migrate client_projects passwords
    const { data: projects } = await supabase
      .from("client_projects")
      .select("id, cpanel_password, site_access_password");

    if (projects) {
      for (const project of projects) {
        let updated = false;
        const updates: Record<string, string> = {};

        if (project.cpanel_password && !isEncrypted(project.cpanel_password)) {
          try {
            updates.cpanel_password = await encrypt(project.cpanel_password);
            updated = true;
          } catch (e) {
            log.error("cpanel_password encryption error", { error: e instanceof Error ? e.message : 'Unknown' });
            results.client_projects.errors++;
          }
        }

        if (project.site_access_password && !isEncrypted(project.site_access_password)) {
          try {
            updates.site_access_password = await encrypt(project.site_access_password);
            updated = true;
          } catch (e) {
            log.error("site_access_password encryption error", { error: e instanceof Error ? e.message : 'Unknown' });
            results.client_projects.errors++;
          }
        }

        if (updated && Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from("client_projects")
            .update(updates)
            .eq("id", project.id);

          if (error) {
            log.error("Error updating project", { error: error.message });
            results.client_projects.errors++;
          } else {
            results.client_projects.migrated++;
          }
        } else if (!project.cpanel_password && !project.site_access_password) {
          results.client_projects.skipped++;
        } else {
          results.client_projects.skipped++;
        }
      }
    }

    log("Migration completed", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    log.error("Migration error", { error: error instanceof Error ? error.message : 'Unknown error' });
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
