-- Fix broken internal links in blog posts
-- The links reference non-existent slugs, need to update to correct slugs

-- Update post: site-para-mei-vendedor-24h
-- Fix self-referencing link and broken link
UPDATE blog_posts
SET content = REPLACE(
  REPLACE(content, 
    'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
    'href="/blog/de-site-comum-imã-leads-seo-analytics"'),
  'href="/blog/site-para-mei-vendedor-24h"><em>Exemplos de sites simples para MEI que geram clientes</em></a>',
  'href="/blog/site-para-profissional-liberal-cartao-digital"><em>Profissional liberal: como criar um site que realmente traz clientes</em></a>'
)
WHERE slug = 'site-para-mei-vendedor-24h';

-- Update post: site-para-advogado-autoridade-oab
UPDATE blog_posts
SET content = REPLACE(
  REPLACE(content, 
    'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
    'href="/blog/de-site-comum-imã-leads-seo-analytics"'),
  'href="/blog/de-site-comum-imã-leads-seo-analytics"><em>Transforme seu site comum em um imã de leads</em></a>',
  'href="/blog/de-site-comum-imã-leads-seo-analytics">De site comum a imã de leads: use SEO e Analytics a seu favor</a>'
)
WHERE slug = 'site-para-advogado-autoridade-oab';

-- Update post: site-para-medicos-e-clinicas-agenda-cheia
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'site-para-medicos-e-clinicas-agenda-cheia';

-- Update post: site-para-psicologos-fortaleca-sua-marca
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'site-para-psicologos-fortaleca-sua-marca';

-- Update post: site-para-nutricionistas-blog-estrategico
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'site-para-nutricionistas-blog-estrategico';

-- Update post: site-para-profissional-liberal-cartao-digital
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'site-para-profissional-liberal-cartao-digital';

-- Update post: ssl-gratuito-webq-seguranca-e-confianca
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'ssl-gratuito-webq-seguranca-e-confianca';

-- Update post: de-site-comum-imã-leads-seo-analytics
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE slug = 'de-site-comum-imã-leads-seo-analytics';

-- Also fix any occurrences of the old pattern globally across all posts
UPDATE blog_posts
SET content = REPLACE(content, 
  'href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"', 
  'href="/blog/de-site-comum-imã-leads-seo-analytics"'
)
WHERE content LIKE '%href="/blog/site-comum-a-ima-de-leads-seo-e-analytics"%';