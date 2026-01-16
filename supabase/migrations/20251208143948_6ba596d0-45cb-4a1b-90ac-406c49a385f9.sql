-- Update RLS policy to include plan_performance instead of plan_ecommerce
DROP POLICY IF EXISTS "Anyone can view public settings" ON system_settings;

CREATE POLICY "Anyone can view public settings" 
ON system_settings 
FOR SELECT 
USING (key = ANY (ARRAY['plan_basic'::text, 'plan_professional'::text, 'plan_performance'::text, 'hero_content'::text, 'cta_content'::text, 'brand_creation_config'::text]));