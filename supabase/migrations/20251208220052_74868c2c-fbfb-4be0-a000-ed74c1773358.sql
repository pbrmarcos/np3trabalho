-- Drop existing policy and recreate with portfolio_showcase_config included
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
  'portfolio_showcase_config'::text
]));