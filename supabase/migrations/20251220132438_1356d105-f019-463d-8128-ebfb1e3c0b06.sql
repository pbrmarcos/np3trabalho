-- Add missing storage policies for admins to manage all buckets

-- Portfolio screenshots bucket
CREATE POLICY "Admins can upload portfolio screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update portfolio screenshots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'portfolio-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete portfolio screenshots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'portfolio-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view portfolio screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portfolio-screenshots');

-- Allow admins to manage all brand-files
CREATE POLICY "Admins can upload brand files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'brand-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update brand files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'brand-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to manage all design-files
CREATE POLICY "Admins can upload design files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'design-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update design files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'design-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to manage all onboarding-files
CREATE POLICY "Admins can upload onboarding files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update onboarding files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to manage all project-files
CREATE POLICY "Admins can upload project files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update project files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete project files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view all project files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to manage client-logos
CREATE POLICY "Admins can upload client logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update client logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete client logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);