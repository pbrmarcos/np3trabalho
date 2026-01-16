-- Create notification_queue table for reliable delivery
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_slug TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  dedup_key TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_by UUID
);

-- Index for processing pending items
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_created 
ON public.notification_queue(status, created_at) 
WHERE status = 'pending';

-- Index for deduplication lookup
CREATE INDEX IF NOT EXISTS idx_notification_queue_dedup 
ON public.notification_queue(dedup_key, created_at) 
WHERE dedup_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own notifications
CREATE POLICY "Users can insert notifications"
ON public.notification_queue FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- Allow service role full access (for cron processing)
CREATE POLICY "Service role full access"
ON public.notification_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Cleanup old processed notifications (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.notification_queue 
  WHERE (status IN ('sent', 'failed', 'skipped') AND processed_at < now() - interval '7 days')
     OR (status = 'pending' AND created_at < now() - interval '24 hours');
END;
$$;