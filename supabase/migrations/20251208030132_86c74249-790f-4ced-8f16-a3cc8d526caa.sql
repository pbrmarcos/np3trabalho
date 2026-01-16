-- Allow clients to upload files to their own projects in storage
CREATE POLICY "Clients can upload project files storage"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND EXISTS (
    SELECT 1 FROM client_projects 
    WHERE client_projects.client_id = auth.uid() 
    AND (storage.foldername(name))[1] = client_projects.id::text
  )
);

-- Allow clients to insert records into project_files table for their projects
CREATE POLICY "Clients can upload their own project files"
ON public.project_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_projects 
    WHERE client_projects.id = project_files.project_id 
    AND client_projects.client_id = auth.uid()
  )
);