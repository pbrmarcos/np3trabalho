-- Add hosting fields to client_projects
ALTER TABLE public.client_projects
ADD COLUMN IF NOT EXISTS server_ip text DEFAULT '185.158.133.1',
ADD COLUMN IF NOT EXISTS cpanel_url text,
ADD COLUMN IF NOT EXISTS cpanel_login text,
ADD COLUMN IF NOT EXISTS cpanel_password text;