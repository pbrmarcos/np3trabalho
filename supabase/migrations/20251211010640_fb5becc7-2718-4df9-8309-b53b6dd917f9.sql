-- Drop the incorrect policies
DROP POLICY IF EXISTS "Clients can upload files to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload project files storage" ON storage.objects;

-- Create correct policy for client uploads
CREATE POLICY "Clients can upload to their projects"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.client_id = auth.uid()
    AND (storage.foldername(name))[1] = client_projects.id::text
  )
);