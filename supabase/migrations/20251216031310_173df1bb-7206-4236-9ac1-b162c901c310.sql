-- Table to cache user subscription status (updated via webhook)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan_id text,
  current_period_end timestamp with time zone,
  billing_type text DEFAULT 'recurring', -- 'recurring' or 'one_time'
  one_time_expiry timestamp with time zone, -- for one-time payments
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND (
        -- Active recurring subscription
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR
        -- Valid one-time payment
        (billing_type = 'one_time' AND one_time_expiry > now())
      )
  )
$$;

-- Function to check if user is admin OR has active subscription
CREATE OR REPLACE FUNCTION public.can_access_project_features(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin'::app_role) 
    OR has_active_subscription(_user_id)
$$;

-- UPDATE project_files: Add INSERT restriction based on subscription
-- First drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Clients can upload their own project files" ON public.project_files;

-- Recreate with subscription check
CREATE POLICY "Clients can upload their own project files"
ON public.project_files
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_projects.id = project_files.project_id
      AND client_projects.client_id = auth.uid()
  ))
  AND can_access_project_features(auth.uid())
);

-- UPDATE project_tickets: Add INSERT restriction based on subscription
-- First drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Clients can create tickets for their projects" ON public.project_tickets;

-- Recreate with subscription check
CREATE POLICY "Clients can create tickets for their projects"
ON public.project_tickets
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_projects.id = project_tickets.project_id
      AND client_projects.client_id = auth.uid()
  ))
  AND created_by = auth.uid()
  AND can_access_project_features(auth.uid())
);

-- UPDATE ticket_messages: Add INSERT restriction based on subscription
DROP POLICY IF EXISTS "Users can add messages to their tickets" ON public.ticket_messages;

CREATE POLICY "Users can add messages to their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM project_tickets
    JOIN client_projects ON client_projects.id = project_tickets.project_id
    WHERE project_tickets.id = ticket_messages.ticket_id
      AND client_projects.client_id = auth.uid()
  ))
  AND user_id = auth.uid()
  AND can_access_project_features(auth.uid())
);