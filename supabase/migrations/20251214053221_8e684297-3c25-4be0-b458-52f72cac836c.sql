-- Update RLS policy to include contact_config in public readable settings
DROP POLICY IF EXISTS "Anyone can view public settings" ON system_settings;

CREATE POLICY "Anyone can view public settings"
ON system_settings
FOR SELECT
USING (key = ANY (ARRAY[
  'plan_basic',
  'plan_professional', 
  'plan_performance',
  'hero_content',
  'cta_content',
  'brand_creation_config',
  'faq_content',
  'portfolio_showcase_config',
  'homepage_faq_content',
  'brand_logos_config',
  'contact_config'
]));