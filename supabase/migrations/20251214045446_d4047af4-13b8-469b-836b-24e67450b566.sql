-- Add attachment fields to migration_messages table
ALTER TABLE public.migration_messages 
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;