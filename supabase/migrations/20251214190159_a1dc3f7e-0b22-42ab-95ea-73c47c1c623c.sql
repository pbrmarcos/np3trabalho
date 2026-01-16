
-- Create onboarding-files bucket for inspiration images uploaded during onboarding
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-files', 'onboarding-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admins can manage all onboarding files
CREATE POLICY "Admins can manage onboarding files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Authenticated users can upload onboarding files
CREATE POLICY "Users can upload onboarding files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-files' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can view their own onboarding files
CREATE POLICY "Users can view their onboarding files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'onboarding-files' 
  AND auth.uid() IS NOT NULL
);

-- Fix: Add INSERT policy for brand-files bucket (missing)
CREATE POLICY "Users can upload brand files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'brand-files' 
  AND auth.uid() IS NOT NULL
);
