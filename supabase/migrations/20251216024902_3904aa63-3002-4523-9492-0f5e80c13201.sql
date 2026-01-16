-- Fix migration_requests RLS - remove public SELECT and add proper owner-based policy
DROP POLICY IF EXISTS "Anyone can view migration by email or domain" ON public.migration_requests;

-- Create proper policy: only request owner (by email) or admins can view
CREATE POLICY "Users can view their own migration requests by email" 
ON public.migration_requests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix migration_messages RLS - remove public SELECT  
DROP POLICY IF EXISTS "Anyone can view migration messages" ON public.migration_messages;

-- Create proper policy: only participants can view messages
CREATE POLICY "Users can view their own migration messages" 
ON public.migration_messages 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM migration_requests mr 
    WHERE mr.id = migration_messages.migration_id 
    AND mr.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);