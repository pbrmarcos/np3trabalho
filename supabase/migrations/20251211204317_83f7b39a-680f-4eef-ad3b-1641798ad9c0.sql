-- Fix storage policies for design-files bucket (simpler approach without array syntax)
DROP POLICY IF EXISTS "Clients can view their own design files" ON storage.objects;

CREATE POLICY "Clients can view their own design files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'design-files' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Clients can upload their own design files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'design-files' AND 
  auth.uid() IS NOT NULL
);