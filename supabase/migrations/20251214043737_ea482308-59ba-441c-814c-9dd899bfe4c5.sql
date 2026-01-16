-- Create migration_requests table
CREATE TABLE public.migration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  current_domain TEXT NOT NULL,
  current_host TEXT,
  site_type TEXT NOT NULL DEFAULT 'wordpress',
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.migration_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all migration requests"
ON public.migration_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert migration requests"
ON public.migration_requests
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_migration_requests_updated_at
BEFORE UPDATE ON public.migration_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_migration_requests_status ON public.migration_requests(status);
CREATE INDEX idx_migration_requests_created_at ON public.migration_requests(created_at DESC);