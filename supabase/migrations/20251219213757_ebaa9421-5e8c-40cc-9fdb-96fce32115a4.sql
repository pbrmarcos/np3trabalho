-- Add additional columns to cookie_consent_logs for enhanced auditing
ALTER TABLE public.cookie_consent_logs 
ADD COLUMN user_email TEXT,
ADD COLUMN user_name TEXT,
ADD COLUMN country TEXT,
ADD COLUMN region TEXT,
ADD COLUMN device_type TEXT,
ADD COLUMN browser_name TEXT,
ADD COLUMN browser_version TEXT,
ADD COLUMN os_name TEXT,
ADD COLUMN referrer_url TEXT,
ADD COLUMN pages_visited INTEGER DEFAULT 0,
ADD COLUMN time_on_site_seconds INTEGER DEFAULT 0;

-- Add indexes for new queryable columns
CREATE INDEX idx_cookie_consent_logs_country ON public.cookie_consent_logs(country);
CREATE INDEX idx_cookie_consent_logs_device_type ON public.cookie_consent_logs(device_type);

-- Add comment for documentation
COMMENT ON COLUMN public.cookie_consent_logs.country IS 'País do usuário baseado em IP/locale';
COMMENT ON COLUMN public.cookie_consent_logs.device_type IS 'mobile, tablet ou desktop';
COMMENT ON COLUMN public.cookie_consent_logs.pages_visited IS 'Número de páginas visitadas antes do consentimento';
COMMENT ON COLUMN public.cookie_consent_logs.time_on_site_seconds IS 'Tempo no site antes do consentimento em segundos';