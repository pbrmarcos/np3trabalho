-- Add cloud_drive_url column to client_projects table
ALTER TABLE public.client_projects 
ADD COLUMN cloud_drive_url TEXT;

COMMENT ON COLUMN public.client_projects.cloud_drive_url IS 
  'URL do Cloud Drive compartilhado com o cliente (Google Drive, Dropbox, etc.)';