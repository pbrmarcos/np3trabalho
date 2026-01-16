-- Drop and recreate the public settings policy to include brand_logos_config
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;

CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (key = ANY (ARRAY[
  'plan_basic'::text, 
  'plan_professional'::text, 
  'plan_performance'::text, 
  'hero_content'::text, 
  'cta_content'::text, 
  'brand_creation_config'::text, 
  'faq_content'::text, 
  'portfolio_showcase_config'::text, 
  'homepage_faq_content'::text,
  'brand_logos_config'::text
]));