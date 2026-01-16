-- Create brand_deliveries table for tracking versions sent by admin
CREATE TABLE public.brand_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.client_onboarding(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  package_number INTEGER NOT NULL DEFAULT 1,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create brand_delivery_files table for files in each delivery
CREATE TABLE public.brand_delivery_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.brand_deliveries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create brand_feedback table for client responses
CREATE TABLE public.brand_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.brand_deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add brand tracking columns to client_onboarding
ALTER TABLE public.client_onboarding 
ADD COLUMN IF NOT EXISTS brand_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS brand_current_package INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS brand_versions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brand_revisions_used INTEGER DEFAULT 0;

-- Enable RLS on all new tables
ALTER TABLE public.brand_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_delivery_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_feedback ENABLE ROW LEVEL SECURITY;

-- RLS for brand_deliveries
CREATE POLICY "Admins can manage all brand deliveries" ON public.brand_deliveries
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own brand deliveries" ON public.brand_deliveries
  FOR SELECT USING (auth.uid() = client_id);

-- RLS for brand_delivery_files
CREATE POLICY "Admins can manage all brand files" ON public.brand_delivery_files
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own brand files" ON public.brand_delivery_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_deliveries 
      WHERE brand_deliveries.id = brand_delivery_files.delivery_id 
      AND brand_deliveries.client_id = auth.uid()
    )
  );

-- RLS for brand_feedback
CREATE POLICY "Admins can manage all brand feedback" ON public.brand_feedback
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own brand feedback" ON public.brand_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_deliveries 
      WHERE brand_deliveries.id = brand_feedback.delivery_id 
      AND brand_deliveries.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert their own brand feedback" ON public.brand_feedback
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.brand_deliveries 
      WHERE brand_deliveries.id = brand_feedback.delivery_id 
      AND brand_deliveries.client_id = auth.uid()
    )
  );

-- Create brand-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-files', 'brand-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for brand-files
CREATE POLICY "Admins can manage brand files storage" ON storage.objects
  FOR ALL USING (bucket_id = 'brand-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own brand files storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create update trigger for brand_deliveries
CREATE TRIGGER update_brand_deliveries_updated_at
  BEFORE UPDATE ON public.brand_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert new email templates
INSERT INTO public.system_email_templates (slug, name, trigger, subject, html_template, description, is_active)
VALUES 
  ('brand_approved', 'Marca Aprovada', 'brand_approved', 'Sua marca foi aprovada! 🎉', 
   '<h1>Parabéns, {{client_name}}!</h1><p>Sua identidade visual para <strong>{{company_name}}</strong> foi aprovada com sucesso.</p><p>Os arquivos finais da sua marca já estão disponíveis para download no seu painel.</p><p>Obrigado por confiar na WebQ!</p>', 
   'Enviado quando cliente aprova a marca final', true),
  ('brand_revision_requested', 'Correção de Marca Solicitada', 'brand_revision', 'Correção solicitada para marca', 
   '<h1>Nova solicitação de correção</h1><p>O cliente <strong>{{client_name}}</strong> ({{company_name}}) solicitou correções na versão {{version_number}} da marca.</p><p><strong>Comentário:</strong></p><p>{{comment}}</p><p>Acesse o painel para visualizar os detalhes.</p>', 
   'Enviado para admins quando cliente solicita correção', true),
  ('brand_package_purchased', 'Pacote Adicional de Marca', 'brand_package', 'Pacote adicional contratado! 🎨', 
   '<h1>Olá, {{client_name}}!</h1><p>Seu pacote adicional de criação de marca foi confirmado.</p><p>Você tem direito a mais 2 versões com 2 correções cada.</p><p>Nossa equipe já está trabalhando e você receberá as novas versões em breve!</p>', 
   'Enviado quando cliente compra pacote adicional', true)
ON CONFLICT (slug) DO NOTHING;