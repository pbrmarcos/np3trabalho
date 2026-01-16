-- Add site access fields to client_projects table
ALTER TABLE public.client_projects
ADD COLUMN IF NOT EXISTS site_access_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS site_access_login text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS site_access_password text DEFAULT NULL;