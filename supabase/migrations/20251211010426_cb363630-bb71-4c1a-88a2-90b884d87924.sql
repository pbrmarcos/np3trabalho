-- Create storage policy to allow clients to upload files to their projects
CREATE POLICY "Clients can upload files to their projects"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_projects.client_id = auth.uid()
    AND (storage.foldername(name))[1] = client_projects.id::text
  )
);