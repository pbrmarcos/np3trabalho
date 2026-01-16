-- Add onboarding_status column to track completion state
ALTER TABLE public.client_onboarding 
ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.client_onboarding.onboarding_status IS 'Status of onboarding: pending (after payment, before details), complete (all details filled)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_onboarding_status ON public.client_onboarding(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_user_status ON public.client_onboarding(user_id, onboarding_status);