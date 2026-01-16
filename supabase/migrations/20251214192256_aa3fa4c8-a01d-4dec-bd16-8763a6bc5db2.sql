-- Add sender_type column to timeline_messages to support client replies
ALTER TABLE public.timeline_messages 
ADD COLUMN sender_type text NOT NULL DEFAULT 'admin';

-- Make admin_id nullable for client messages
ALTER TABLE public.timeline_messages 
ALTER COLUMN admin_id DROP NOT NULL;

-- Add constraint to ensure valid sender_type
ALTER TABLE public.timeline_messages
ADD CONSTRAINT timeline_messages_sender_type_check 
CHECK (sender_type IN ('admin', 'client'));

-- Update RLS policy to allow clients to insert their own messages
CREATE POLICY "Clients can send their own messages"
ON public.timeline_messages
FOR INSERT
WITH CHECK (
  auth.uid() = client_id 
  AND sender_type = 'client'
);

-- Create index for better query performance
CREATE INDEX idx_timeline_messages_sender_type ON public.timeline_messages(sender_type);