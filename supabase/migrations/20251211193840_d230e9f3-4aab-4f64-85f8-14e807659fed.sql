-- Add new fields for site expectations and domain provider
ALTER TABLE public.client_onboarding 
ADD COLUMN IF NOT EXISTS site_expectations text,
ADD COLUMN IF NOT EXISTS domain_provider text;