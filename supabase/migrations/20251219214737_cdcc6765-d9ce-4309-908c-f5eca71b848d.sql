-- Add session_id column to track visitors
ALTER TABLE public.cookie_consent_logs 
ADD COLUMN IF NOT EXISTS session_id text;

-- Create index for faster lookups by session_id
CREATE INDEX IF NOT EXISTS idx_cookie_consent_session_id ON public.cookie_consent_logs(session_id);

-- Allow admins to delete cookie consent logs
CREATE POLICY "Admins can delete cookie consent logs"
ON public.cookie_consent_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));