-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;

-- Create a truly public read policy (allows anonymous access)
CREATE POLICY "Public can read system settings" 
ON public.system_settings 
FOR SELECT 
TO public
USING (true);