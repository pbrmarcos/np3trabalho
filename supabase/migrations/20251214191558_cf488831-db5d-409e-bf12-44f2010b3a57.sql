-- Add read_at column to timeline_messages for tracking read status
ALTER TABLE public.timeline_messages 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for unread messages queries
CREATE INDEX idx_timeline_messages_unread ON public.timeline_messages(client_id, project_id) 
WHERE read_at IS NULL;