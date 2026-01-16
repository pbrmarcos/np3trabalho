-- Create RLS policies for admin-media bucket

-- Allow admins to upload files to admin-media
CREATE POLICY "Admins can upload admin media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admin-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update their files in admin-media
CREATE POLICY "Admins can update admin media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'admin-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete files from admin-media
CREATE POLICY "Admins can delete admin media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'admin-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow anyone to view admin-media files (public bucket)
CREATE POLICY "Anyone can view admin media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'admin-media');