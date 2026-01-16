-- Allow public read access to system_settings for homepage content
CREATE POLICY "Anyone can view public settings"
ON public.system_settings
FOR SELECT
USING (
  key IN ('plan_basic', 'plan_professional', 'plan_ecommerce', 'hero_content', 'cta_content')
);