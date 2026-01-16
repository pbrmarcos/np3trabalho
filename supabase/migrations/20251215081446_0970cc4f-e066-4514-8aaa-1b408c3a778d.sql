-- Add sender_type and client_id columns to migration_messages for client replies
ALTER TABLE public.migration_messages 
ADD COLUMN sender_type text NOT NULL DEFAULT 'admin',
ADD COLUMN client_id uuid NULL;

-- Make admin_id nullable for client messages
ALTER TABLE public.migration_messages ALTER COLUMN admin_id DROP NOT NULL;

-- Add RLS policy for clients to insert their own messages
CREATE POLICY "Clients can insert their own migration messages"
ON public.migration_messages
FOR INSERT
WITH CHECK (
  sender_type = 'client' 
  AND client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM migration_requests mr
    WHERE mr.id = migration_id
    AND mr.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Add index for better query performance
CREATE INDEX idx_migration_messages_migration_id ON public.migration_messages(migration_id);
CREATE INDEX idx_migration_messages_sender_type ON public.migration_messages(sender_type);