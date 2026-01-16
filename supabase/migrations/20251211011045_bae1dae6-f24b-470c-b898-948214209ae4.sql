-- Remover política incorreta
DROP POLICY IF EXISTS "Clients can upload to their projects" ON storage.objects;

-- Criar política corrigida e simples
CREATE POLICY "Clients can upload to project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' 
  AND EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.client_id = auth.uid()
      AND client_projects.id::text = (storage.foldername(name))[1]
  )
);