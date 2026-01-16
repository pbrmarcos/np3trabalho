-- Remover política com bug
DROP POLICY IF EXISTS "Clients can upload to project files" ON storage.objects;

-- Criar política correta (referenciando name de storage.objects, não client_projects.name)
CREATE POLICY "Clients can upload to project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' 
  AND EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.client_id = auth.uid()
      AND client_projects.id::text = (storage.foldername(storage.objects.name))[1]
  )
);