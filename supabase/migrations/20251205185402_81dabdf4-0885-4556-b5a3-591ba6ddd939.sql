-- Add new columns for brand creation details
ALTER TABLE public.client_onboarding 
ADD COLUMN IF NOT EXISTS logo_description TEXT,
ADD COLUMN IF NOT EXISTS inspiration_urls TEXT[];