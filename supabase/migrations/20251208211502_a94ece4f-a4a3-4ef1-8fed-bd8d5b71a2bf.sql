-- Drop the insecure policy that allows any authenticated user to insert notifications
DROP POLICY IF EXISTS "Allow inserts for notifications" ON public.notifications;

-- Create a new policy that only allows admins to insert notifications
CREATE POLICY "Only admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));