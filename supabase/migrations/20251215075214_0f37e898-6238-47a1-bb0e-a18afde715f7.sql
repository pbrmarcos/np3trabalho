-- Add migration fields to client_onboarding table
ALTER TABLE public.client_onboarding
ADD COLUMN IF NOT EXISTS needs_migration BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS migration_current_domain TEXT,
ADD COLUMN IF NOT EXISTS migration_current_host TEXT,
ADD COLUMN IF NOT EXISTS migration_site_type TEXT,
ADD COLUMN IF NOT EXISTS migration_has_access BOOLEAN,
ADD COLUMN IF NOT EXISTS migration_access_notes TEXT,
ADD COLUMN IF NOT EXISTS migration_assistance_level TEXT;