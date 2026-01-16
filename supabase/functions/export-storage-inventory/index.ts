import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("EXPORT-STORAGE-INVENTORY");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log('Starting storage inventory export...', { userId: user.id });

    const buckets = [
      { id: 'client-logos', isPublic: true },
      { id: 'project-files', isPublic: false },
      { id: 'portfolio-screenshots', isPublic: true },
      { id: 'admin-media', isPublic: true },
      { id: 'brand-files', isPublic: false },
      { id: 'design-files', isPublic: false },
      { id: 'onboarding-files', isPublic: false },
    ];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const inventory: {
      exportedAt: string;
      projectId: string;
      supabaseUrl: string;
      buckets: Array<{
        id: string;
        isPublic: boolean;
        files: Array<{
          name: string;
          path: string;
          size: number | null;
          mimeType: string | null;
          createdAt: string | null;
          updatedAt: string | null;
          publicUrl?: string;
          signedUrl?: string;
        }>;
        totalFiles: number;
        totalSize: number;
      }>;
      summary: {
        totalBuckets: number;
        totalFiles: number;
        totalSize: number;
        publicBuckets: number;
        privateBuckets: number;
      };
      migrationInstructions: string[];
    } = {
      exportedAt: new Date().toISOString(),
      projectId: 'ayqhypvxmqoqassouekm',
      supabaseUrl,
      buckets: [],
      summary: {
        totalBuckets: buckets.length,
        totalFiles: 0,
        totalSize: 0,
        publicBuckets: buckets.filter(b => b.isPublic).length,
        privateBuckets: buckets.filter(b => !b.isPublic).length,
      },
      migrationInstructions: [
        '1. Create the same buckets in your new Supabase project',
        '2. For each bucket, set the correct public/private setting',
        '3. Download files using the URLs provided (signed URLs expire in 1 hour)',
        '4. Upload files to the corresponding bucket in new project',
        '5. Update file_url columns in database tables to point to new URLs',
        '6. Tables with file references: project_files, media_files, portfolio_items, design_delivery_files, migration_messages',
      ],
    };

    for (const bucket of buckets) {
      log(`Processing bucket: ${bucket.id}`);
      
      const { data: files, error } = await supabase.storage
        .from(bucket.id)
        .list('', { 
          limit: 1000,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        log.error(`Error listing ${bucket.id}`, { error: error.message });
        inventory.buckets.push({
          id: bucket.id,
          isPublic: bucket.isPublic,
          files: [],
          totalFiles: 0,
          totalSize: 0,
        });
        continue;
      }

      const bucketFiles: typeof inventory.buckets[0]['files'] = [];
      let bucketTotalSize = 0;

      // Process files (may include folders)
      const processPath = async (basePath: string, items: any[]) => {
        for (const item of items) {
          const fullPath = basePath ? `${basePath}/${item.name}` : item.name;
          
          // Check if it's a folder (has no metadata)
          if (!item.metadata) {
            // List contents of folder
            const { data: subItems } = await supabase.storage
              .from(bucket.id)
              .list(fullPath, { limit: 1000 });
            
            if (subItems && subItems.length > 0) {
              await processPath(fullPath, subItems);
            }
            continue;
          }

          // It's a file
          const fileInfo: typeof bucketFiles[0] = {
            name: item.name,
            path: fullPath,
            size: item.metadata?.size || null,
            mimeType: item.metadata?.mimetype || null,
            createdAt: item.created_at || null,
            updatedAt: item.updated_at || null,
          };

          // Get URL
          if (bucket.isPublic) {
            const { data: publicUrlData } = supabase.storage
              .from(bucket.id)
              .getPublicUrl(fullPath);
            fileInfo.publicUrl = publicUrlData.publicUrl;
          } else {
            const { data: signedUrlData } = await supabase.storage
              .from(bucket.id)
              .createSignedUrl(fullPath, 3600); // 1 hour expiry
            fileInfo.signedUrl = signedUrlData?.signedUrl;
          }

          bucketFiles.push(fileInfo);
          bucketTotalSize += item.metadata?.size || 0;
        }
      };

      if (files) {
        await processPath('', files);
      }

      inventory.buckets.push({
        id: bucket.id,
        isPublic: bucket.isPublic,
        files: bucketFiles,
        totalFiles: bucketFiles.length,
        totalSize: bucketTotalSize,
      });

      inventory.summary.totalFiles += bucketFiles.length;
      inventory.summary.totalSize += bucketTotalSize;
    }

    // Log the export
    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'export',
      entity_type: 'storage_inventory',
      description: `Exported storage inventory (${inventory.summary.totalFiles} files, ${(inventory.summary.totalSize / 1024 / 1024).toFixed(2)} MB)`,
      metadata: { 
        total_files: inventory.summary.totalFiles,
        total_size_mb: (inventory.summary.totalSize / 1024 / 1024).toFixed(2)
      }
    });

    log(`Storage inventory completed: ${inventory.summary.totalFiles} files`);

    // Export as JavaScript module
    const jsContent = `// WebQ Storage Inventory - Exported ${new Date().toISOString()}
// Run with: node download-storage.js

const inventory = ${JSON.stringify(inventory, null, 2)};

module.exports = inventory;
`;

    return new Response(jsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Content-Disposition': 'attachment; filename=storage-inventory.js',
      },
    });
  } catch (error) {
    log.error('Error exporting storage inventory', { error: error instanceof Error ? error.message : 'Unknown error' });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
