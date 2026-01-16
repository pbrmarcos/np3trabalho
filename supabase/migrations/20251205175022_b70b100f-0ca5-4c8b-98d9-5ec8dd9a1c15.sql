-- Create client_onboarding table
CREATE TABLE public.client_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Identidade
  company_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  business_description TEXT,
  
  -- Contato Digital
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  
  -- Domínio & Marca
  has_domain BOOLEAN DEFAULT false,
  domain_name TEXT,
  has_logo BOOLEAN DEFAULT false,
  logo_url TEXT,
  needs_brand_creation BOOLEAN DEFAULT false,
  preferred_color TEXT,
  
  -- Plano e Pagamento
  selected_plan TEXT NOT NULL,
  brand_creation_paid BOOLEAN DEFAULT false,
  stripe_session_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own onboarding"
ON public.client_onboarding
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
ON public.client_onboarding
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
ON public.client_onboarding
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all onboarding"
ON public.client_onboarding
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_client_onboarding_updated_at
BEFORE UPDATE ON public.client_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true);

-- Storage policies for client-logos bucket
CREATE POLICY "Users can upload their own logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-logos');

CREATE POLICY "Admins can manage all logos"
ON storage.objects
FOR ALL
USING (bucket_id = 'client-logos' AND has_role(auth.uid(), 'admin'::app_role));