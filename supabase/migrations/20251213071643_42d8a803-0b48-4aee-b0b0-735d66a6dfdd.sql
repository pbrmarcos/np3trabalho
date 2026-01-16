-- Add domain management fields to client_projects
ALTER TABLE public.client_projects
ADD COLUMN IF NOT EXISTS domain_status text DEFAULT 'needs_registration',
ADD COLUMN IF NOT EXISTS dns_record_1 text,
ADD COLUMN IF NOT EXISTS dns_record_2 text,
ADD COLUMN IF NOT EXISTS domain_notes text;