-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can create migration requests" ON public.migration_requests;

-- Create permissive policy for public inserts
CREATE POLICY "Anyone can create migration requests" 
ON public.migration_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);