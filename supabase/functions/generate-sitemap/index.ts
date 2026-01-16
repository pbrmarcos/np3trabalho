import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("GENERATE-SITEMAP");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Get base URL from request or use default
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://webq.com.br';
    const previewOnly = url.searchParams.get('preview') === 'true';

    logger.info("Generating sitemap", { baseUrl });

    // Static pages with their priorities and change frequencies
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/planos', priority: '0.9', changefreq: 'weekly' },
      { path: '/design', priority: '0.9', changefreq: 'weekly' },
      { path: '/migracao', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog', priority: '0.8', changefreq: 'daily' },
      { path: '/ajuda', priority: '0.8', changefreq: 'weekly' },
      { path: '/cadastro', priority: '0.7', changefreq: 'monthly' },
    ];

    // Fetch published blog posts (non-isolated)
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
      .eq('is_isolated_page', false)
      .order('published_at', { ascending: false });

    if (blogError) {
      logger.error("Error fetching blog posts", { error: blogError.message });
    }

    // Fetch isolated pages (published)
    const { data: isolatedPages, error: isolatedError } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
      .eq('is_isolated_page', true);

    if (isolatedError) {
      logger.error("Error fetching isolated pages", { error: isolatedError.message });
    }

    // Fetch help categories
    const { data: helpCategories, error: categoriesError } = await supabase
      .from('help_categories')
      .select('slug, updated_at')
      .eq('is_active', true);

    if (categoriesError) {
      logger.error("Error fetching help categories", { error: categoriesError.message });
    }

    // Fetch help articles
    const { data: helpArticles, error: articlesError } = await supabase
      .from('help_articles')
      .select('slug, updated_at, category_id, help_categories!inner(slug)')
      .eq('is_published', true);

    if (articlesError) {
      logger.error("Error fetching help articles", { error: articlesError.message });
    }

    const today = new Date().toISOString().split('T')[0];

    // Build URLs array
    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    // Add static pages
    for (const page of staticPages) {
      urls.push({
        loc: `${baseUrl}${page.path}`,
        lastmod: today,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }

    // Add blog posts
    if (blogPosts) {
      for (const post of blogPosts) {
        urls.push({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod: post.updated_at ? post.updated_at.split('T')[0] : today,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    }

    // Add isolated pages
    if (isolatedPages) {
      for (const page of isolatedPages) {
        urls.push({
          loc: `${baseUrl}/${page.slug}`,
          lastmod: page.updated_at ? page.updated_at.split('T')[0] : today,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    }

    // Add help categories
    if (helpCategories) {
      for (const category of helpCategories) {
        urls.push({
          loc: `${baseUrl}/ajuda/categoria/${category.slug}`,
          lastmod: category.updated_at ? category.updated_at.split('T')[0] : today,
          changefreq: 'weekly',
          priority: '0.6',
        });
      }
    }

    // Add help articles
    if (helpArticles) {
      for (const article of helpArticles) {
        const categorySlug = (article as any).help_categories?.slug;
        if (categorySlug) {
          urls.push({
            loc: `${baseUrl}/ajuda/${categorySlug}/${article.slug}`,
            lastmod: article.updated_at ? article.updated_at.split('T')[0] : today,
            changefreq: 'monthly',
            priority: '0.6',
          });
        }
      }
    }

    // If preview mode, return JSON with counts
    if (previewOnly) {
      const counts = {
        static: staticPages.length,
        blogPosts: blogPosts?.length || 0,
        isolatedPages: isolatedPages?.length || 0,
        helpCategories: helpCategories?.length || 0,
        helpArticles: helpArticles?.length || 0,
        total: urls.length,
      };

      return new Response(
        JSON.stringify({ counts, urls }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate XML sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    logger.info("Sitemap generated", { urlCount: urls.length });

    return new Response(xml, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error generating sitemap", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
