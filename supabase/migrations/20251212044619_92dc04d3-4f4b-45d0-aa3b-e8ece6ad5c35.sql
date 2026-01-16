-- Add brand-specific fields to design_orders table
ALTER TABLE public.design_orders 
ADD COLUMN IF NOT EXISTS preferred_color text,
ADD COLUMN IF NOT EXISTS logo_description text,
ADD COLUMN IF NOT EXISTS inspiration_urls text[];

-- Create an index for category filtering
CREATE INDEX IF NOT EXISTS idx_design_orders_package_id ON public.design_orders(package_id);

-- Update the design_packages table to ensure brand package exists with correct category
UPDATE public.design_packages 
SET category_id = 'cat-brand'
WHERE id = 'pkg-brand-creation';

-- Update max_revisions default for brand packages to 2
-- This is optional, just ensuring consistency