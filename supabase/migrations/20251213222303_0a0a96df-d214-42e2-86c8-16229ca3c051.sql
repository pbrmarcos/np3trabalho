-- Create action_logs table for audit trail
CREATE TABLE public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'status_change', 'approve', 'reject', 'upload', 'download', 'send')),
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  description text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_action_logs_user ON public.action_logs(user_id);
CREATE INDEX idx_action_logs_entity ON public.action_logs(entity_type, entity_id);
CREATE INDEX idx_action_logs_created ON public.action_logs(created_at DESC);
CREATE INDEX idx_action_logs_action_type ON public.action_logs(action_type);

-- Enable RLS
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
ON public.action_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own logs
CREATE POLICY "Authenticated users can insert logs"
ON public.action_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);