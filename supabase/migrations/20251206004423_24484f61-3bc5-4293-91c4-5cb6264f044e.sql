-- Create table for project credentials (logins, passwords, etc.)
CREATE TABLE public.project_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('hosting', 'email', 'analytics', 'domain', 'other')),
  label TEXT NOT NULL,
  username TEXT,
  password TEXT,
  url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for project shared files
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_credentials
CREATE POLICY "Admins can manage all credentials"
ON public.project_credentials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own project credentials"
ON public.project_credentials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects 
    WHERE client_projects.id = project_credentials.project_id 
    AND client_projects.client_id = auth.uid()
  )
);

-- RLS Policies for project_files
CREATE POLICY "Admins can manage all files"
ON public.project_files
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own project files"
ON public.project_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects 
    WHERE client_projects.id = project_files.project_id 
    AND client_projects.client_id = auth.uid()
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_project_credentials_updated_at
BEFORE UPDATE ON public.project_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Storage policies for project files
CREATE POLICY "Admins can manage project files storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'project-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their project files storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files' AND 
  EXISTS (
    SELECT 1 FROM public.client_projects 
    WHERE client_projects.client_id = auth.uid()
  )
);