-- Create table to log cookie consent events for LGPD compliance and auditing
CREATE TABLE public.cookie_consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  consent_type TEXT NOT NULL, -- 'accept_all', 'accept_essential', 'custom', 'reset'
  essential BOOLEAN NOT NULL DEFAULT true,
  preferences BOOLEAN NOT NULL DEFAULT false,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.cookie_consent_logs IS 'Logs de consentimento de cookies para conformidade LGPD';

-- Create index for faster queries
CREATE INDEX idx_cookie_consent_logs_created_at ON public.cookie_consent_logs(created_at DESC);
CREATE INDEX idx_cookie_consent_logs_user_id ON public.cookie_consent_logs(user_id);
CREATE INDEX idx_cookie_consent_logs_consent_type ON public.cookie_consent_logs(consent_type);

-- Enable Row Level Security
ALTER TABLE public.cookie_consent_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins can read all cookie consent logs"
ON public.cookie_consent_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert consent logs (for anonymous users)
CREATE POLICY "Anyone can create cookie consent logs"
ON public.cookie_consent_logs
FOR INSERT
WITH CHECK (true);