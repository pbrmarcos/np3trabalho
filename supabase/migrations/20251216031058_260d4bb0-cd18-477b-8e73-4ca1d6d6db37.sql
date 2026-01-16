-- Table to track processed webhook events (idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_processed_webhook_events_stripe_event_id ON public.processed_webhook_events(stripe_event_id);
CREATE INDEX idx_processed_webhook_events_processed_at ON public.processed_webhook_events(processed_at);

-- Enable RLS
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no user access)
CREATE POLICY "Service role only for webhook events"
ON public.processed_webhook_events
FOR ALL
USING (false);

-- Add UNIQUE constraint on stripe_session_id in design_orders (if not null)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'design_orders_stripe_session_id_unique'
  ) THEN
    ALTER TABLE public.design_orders
    ADD CONSTRAINT design_orders_stripe_session_id_unique UNIQUE (stripe_session_id);
  END IF;
END $$;

-- Add UNIQUE constraint on stripe_session_id in client_onboarding (if not null)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_onboarding_stripe_session_id_unique'
  ) THEN
    ALTER TABLE public.client_onboarding
    ADD CONSTRAINT client_onboarding_stripe_session_id_unique UNIQUE (stripe_session_id);
  END IF;
END $$;

-- Cleanup old processed events (keep last 90 days) - function for scheduled cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.processed_webhook_events 
  WHERE processed_at < now() - interval '90 days';
END;
$$;