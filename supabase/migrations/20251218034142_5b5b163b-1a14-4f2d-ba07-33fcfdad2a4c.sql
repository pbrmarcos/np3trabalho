-- Storage policies for client-logos bucket (public)
CREATE POLICY "Anyone can view client logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated users can upload client logos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for brand-files bucket (private)
CREATE POLICY "Users can view their own brand files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'brand-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can upload brand files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'brand-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own brand files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'brand-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Storage policies for design-files bucket (private)
CREATE POLICY "Users can view their own design files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'design-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Authenticated users can upload design files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'design-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own design files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'design-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Storage policies for onboarding-files bucket (private)
CREATE POLICY "Users can view their own onboarding files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'onboarding-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can upload onboarding files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'onboarding-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own onboarding files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'onboarding-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Storage policies for project-files bucket (private)
CREATE POLICY "Users can view project files they own" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'project-files' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM client_projects 
      WHERE client_id = auth.uid() 
      AND id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can upload project files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM client_projects 
      WHERE client_id = auth.uid() 
      AND id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can delete their project files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'project-files' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM client_projects 
      WHERE client_id = auth.uid() 
      AND id::text = (storage.foldername(name))[1]
    )
  )
);