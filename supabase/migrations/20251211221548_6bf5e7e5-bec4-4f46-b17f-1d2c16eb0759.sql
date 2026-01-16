
-- Create design service categories table
CREATE TABLE IF NOT EXISTS public.design_service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Palette',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create design packages table
CREATE TABLE IF NOT EXISTS public.design_packages (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.design_service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  includes TEXT[],
  estimated_days INTEGER DEFAULT 5,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_bundle BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create design orders table
CREATE TABLE IF NOT EXISTS public.design_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  package_id TEXT NOT NULL REFERENCES public.design_packages(id),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_session_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  reference_files TEXT[],
  revisions_used INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create design deliveries table
CREATE TABLE IF NOT EXISTS public.design_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.design_orders(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  delivery_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create design delivery files table
CREATE TABLE IF NOT EXISTS public.design_delivery_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create design feedback table
CREATE TABLE IF NOT EXISTS public.design_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.design_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_delivery_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_service_categories (public read)
CREATE POLICY "Anyone can view active categories" ON public.design_service_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.design_service_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for design_packages (public read)
CREATE POLICY "Anyone can view active packages" ON public.design_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage packages" ON public.design_packages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for design_orders
CREATE POLICY "Clients can view their own orders" ON public.design_orders FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can create orders" ON public.design_orders FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Admins can manage all orders" ON public.design_orders FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for design_deliveries
CREATE POLICY "Clients can view their order deliveries" ON public.design_deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.design_orders WHERE design_orders.id = design_deliveries.order_id AND design_orders.client_id = auth.uid())
);
CREATE POLICY "Admins can manage all deliveries" ON public.design_deliveries FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for design_delivery_files
CREATE POLICY "Clients can view their delivery files" ON public.design_delivery_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.design_deliveries 
    JOIN public.design_orders ON design_orders.id = design_deliveries.order_id 
    WHERE design_deliveries.id = design_delivery_files.delivery_id AND design_orders.client_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all delivery files" ON public.design_delivery_files FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for design_feedback
CREATE POLICY "Clients can view their feedback" ON public.design_feedback FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.design_deliveries 
    JOIN public.design_orders ON design_orders.id = design_deliveries.order_id 
    WHERE design_deliveries.id = design_feedback.delivery_id AND design_orders.client_id = auth.uid()
  )
);
CREATE POLICY "Clients can create feedback" ON public.design_feedback FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.design_deliveries 
    JOIN public.design_orders ON design_orders.id = design_deliveries.order_id 
    WHERE design_deliveries.id = design_feedback.delivery_id AND design_orders.client_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all feedback" ON public.design_feedback FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public) VALUES ('design-files', 'design-files', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for design-files bucket
CREATE POLICY "Clients can view their design files" ON storage.objects FOR SELECT USING (
  bucket_id = 'design-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "Clients can upload design files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'design-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "Admins can manage design files" ON storage.objects FOR ALL USING (
  bucket_id = 'design-files' AND has_role(auth.uid(), 'admin')
);

-- Insert initial categories
INSERT INTO public.design_service_categories (id, name, description, icon, display_order, is_active) VALUES
('cat-social', 'Redes Sociais', 'Artes para redes sociais', 'Share2', 1, true),
('cat-papelaria', 'Papelaria', 'Materiais de papelaria corporativa', 'FileText', 2, true),
('cat-marketing', 'Marketing Digital', 'Materiais para marketing e divulgação', 'TrendingUp', 3, true),
('cat-apresentacoes', 'Apresentações & Materiais', 'Apresentações e materiais institucionais', 'Presentation', 4, true);

-- Insert initial packages
INSERT INTO public.design_packages (id, category_id, name, description, price, stripe_product_id, stripe_price_id, includes, estimated_days, display_order, is_active, is_bundle) VALUES
('pkg-10artes', 'cat-social', 'Pacote 10 Artes para Redes Sociais', '10 artes personalizadas para redes sociais', 300, 'prod_TaRq8MOTu6ug9U', 'price_1SdGwUEXNRV7tn1dPn8NNdtu', ARRAY['10 artes personalizadas', 'Formatos para Instagram, Facebook e LinkedIn', 'Até 2 rodadas de ajustes'], 5, 1, true, false),
('pkg-20artes', 'cat-social', 'Pacote 20 Artes para Redes Sociais', '20 artes personalizadas para redes sociais', 450, 'prod_TaRsbwuX5pem2f', 'price_1SdGypEXNRV7tn1d6fEs3NKx', ARRAY['20 artes personalizadas', 'Formatos para Instagram, Facebook e LinkedIn', 'Até 3 rodadas de ajustes'], 7, 2, true, false),
('pkg-30artes', 'cat-social', 'Pacote 30 Artes para Redes Sociais', '30 artes personalizadas para redes sociais', 650, 'prod_TaRs9RKKLmZWr6', 'price_1SdGz0EXNRV7tn1dC70PxOzK', ARRAY['30 artes personalizadas', 'Formatos para Instagram, Facebook e LinkedIn', 'Até 4 rodadas de ajustes'], 10, 3, true, false),
('pkg-kit-papelaria', 'cat-papelaria', 'Kit Papelaria Completo', 'Kit completo com Cartão de Visita, Papel Timbrado e Envelope', 180, 'prod_TaRsIfctJuOljz', 'price_1SdGzCEXNRV7tn1dc9Ia4UyT', ARRAY['Cartão de visita frente e verso', 'Papel timbrado A4', 'Envelope personalizado', '2 rodadas de ajustes'], 5, 1, true, true),
('pkg-cartao-visita', 'cat-papelaria', 'Cartão de Visita', 'Cartão de visita profissional personalizado', 80, 'prod_TaRtLWp8RPatcb', 'price_1SdGzREXNRV7tn1dpaBnO72j', ARRAY['Design frente e verso', 'Arquivo pronto para impressão', '2 rodadas de ajustes'], 3, 2, true, false),
('pkg-papel-timbrado', 'cat-papelaria', 'Papel Timbrado', 'Papel timbrado profissional personalizado', 70, 'prod_TaRt1ckGUa6ipz', 'price_1SdGzcEXNRV7tn1dyi2l8XVm', ARRAY['Design A4', 'Arquivo editável', '2 rodadas de ajustes'], 3, 3, true, false),
('pkg-envelope', 'cat-papelaria', 'Envelope', 'Envelope personalizado com identidade visual', 90, 'prod_TaT12juNTE9GsA', 'price_1SdI5QEXNRV7tn1dLNXKohba', ARRAY['Envelope saco ou carta', 'Arquivo pronto para impressão', '2 rodadas de ajustes'], 3, 4, true, false),
('pkg-banner', 'cat-marketing', 'Banner Digital', 'Banner digital para web ou redes sociais', 150, 'prod_TaT1fa3uRdxVbV', 'price_1SdI5eEXNRV7tn1dJnQ2M7GY', ARRAY['Banner em alta resolução', 'Formatos web e mobile', '2 rodadas de ajustes'], 3, 1, true, false),
('pkg-assinatura-email', 'cat-marketing', 'Assinatura de E-mail', 'Assinatura de e-mail profissional personalizada', 80, 'prod_TaT29PzMCjA7B2', 'price_1SdI65EXNRV7tn1dLyV5yw8z', ARRAY['Design responsivo', 'Compatível com Gmail, Outlook', '2 rodadas de ajustes'], 2, 2, true, false),
('pkg-convite', 'cat-marketing', 'Convite Digital', 'Convite digital personalizado para eventos', 120, 'prod_TaT3Xwl58Z8ggG', 'price_1SdI6xEXNRV7tn1do4ws7rGl', ARRAY['Design exclusivo', 'Formato para WhatsApp/e-mail', '2 rodadas de ajustes'], 3, 3, true, false),
('pkg-cardapio', 'cat-apresentacoes', 'Cardápio Digital', 'Cardápio digital completo até 5 páginas', 300, 'prod_TaT2OZDpteOwtv', 'price_1SdI6XEXNRV7tn1d59xLx7zn', ARRAY['Até 5 páginas', 'Design personalizado', 'Arquivo PDF interativo', '2 rodadas de ajustes'], 5, 1, true, false),
('pkg-apresentacao', 'cat-apresentacoes', 'Apresentação Institucional', 'Apresentação institucional profissional com 20 slides', 600, 'prod_TaT2hOWom3hbcZ', 'price_1SdI6nEXNRV7tn1dgalsedW7', ARRAY['20 slides', 'Design profissional', 'Animações personalizadas', '3 rodadas de ajustes'], 7, 2, true, false),
('pkg-ebook', 'cat-apresentacoes', 'E-book / Material Rico', 'E-book ou material rico até 10 páginas', 650, 'prod_TaT39KYzqOA4qV', 'price_1SdI7AEXNRV7tn1d4KC3OuNX', ARRAY['Até 10 páginas', 'Design editorial profissional', 'Capa + diagramação', '3 rodadas de ajustes'], 10, 3, true, false);

-- Add email templates for design orders
INSERT INTO public.system_email_templates (slug, name, description, trigger, subject, html_template, is_active, copy_to_admins) VALUES
('design_order_created', 'Pedido de Design Criado', 'Email enviado quando cliente cria um pedido de design', 'design_order_created', 'Seu pedido de design foi recebido!', '<h1>Olá {{client_name}},</h1><p>Recebemos seu pedido de design: <strong>{{package_name}}</strong>.</p><p>Nossa equipe começará a trabalhar no seu material em breve. Você receberá uma notificação quando a primeira versão estiver pronta.</p><p>Prazo estimado: {{estimated_days}} dias úteis.</p>', true, true),
('design_delivery_ready', 'Entrega de Design Pronta', 'Email enviado quando admin envia uma versão do design', 'design_delivery_ready', 'Seu design está pronto para revisão!', '<h1>Olá {{client_name}},</h1><p>A versão {{version_number}} do seu design <strong>{{package_name}}</strong> está pronta!</p><p>Acesse seu painel para visualizar e aprovar ou solicitar ajustes.</p>', true, false),
('design_approved', 'Design Aprovado', 'Email enviado quando cliente aprova o design', 'design_approved', 'Design aprovado com sucesso!', '<h1>Olá {{client_name}},</h1><p>Seu design <strong>{{package_name}}</strong> foi aprovado!</p><p>Os arquivos finais estão disponíveis para download no seu painel.</p>', true, true),
('design_revision_requested', 'Revisão de Design Solicitada', 'Email enviado quando cliente solicita ajustes', 'design_revision_requested', 'Ajustes solicitados no design', '<h1>Olá,</h1><p>O cliente {{client_name}} solicitou ajustes no design <strong>{{package_name}}</strong>.</p><p>Comentário: {{comment}}</p>', true, true),
('design_order_paid', 'Pagamento de Design Confirmado', 'Email enviado quando pagamento do design é confirmado', 'design_order_paid', 'Pagamento confirmado - Design', '<h1>Olá {{client_name}},</h1><p>Recebemos o pagamento do seu pedido de design: <strong>{{package_name}}</strong>.</p><p>Nossa equipe já está trabalhando no seu material!</p>', true, false)
ON CONFLICT (slug) DO NOTHING;
