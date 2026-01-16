-- Allow clients to update read_at on their own timeline messages
CREATE POLICY "Clients can mark their messages as read" 
ON public.timeline_messages 
FOR UPDATE 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);