-- Add payment_status column to migration_requests
ALTER TABLE public.migration_requests 
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.migration_requests.payment_status IS 'Payment status: pending, paid, cancelled';