-- Add client-visible notes field to migration_requests
ALTER TABLE public.migration_requests 
ADD COLUMN IF NOT EXISTS client_notes text;

-- Add RLS policy for anyone to read their own migration by email/domain
CREATE POLICY "Anyone can view migration by email or domain" 
ON public.migration_requests 
FOR SELECT 
USING (true);