-- Allow admins to insert messages into client timeline
CREATE POLICY "Admins can insert timeline messages"
ON public.timeline_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);
