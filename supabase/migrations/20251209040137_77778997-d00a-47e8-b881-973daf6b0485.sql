-- Create storage bucket for admin media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-media', 'admin-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-media bucket
CREATE POLICY "Anyone can view admin media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-media');

CREATE POLICY "Admins can upload admin media files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'admin-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin media files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'admin-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete admin media files"
ON storage.objects FOR DELETE
USING (bucket_id = 'admin-media' AND has_role(auth.uid(), 'admin'::app_role));

-- Create media_files table for metadata
CREATE TABLE public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_files
CREATE POLICY "Admins can view all media files"
ON public.media_files FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert media files"
ON public.media_files FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update media files"
ON public.media_files FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete media files"
ON public.media_files FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_media_files_updated_at
BEFORE UPDATE ON public.media_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();