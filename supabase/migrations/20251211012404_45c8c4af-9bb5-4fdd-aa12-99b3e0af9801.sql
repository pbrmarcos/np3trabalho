-- Criar tabela page_seo para gerenciamento de SEO
CREATE TABLE public.page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  page_route TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  keywords TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

-- Admins can manage all SEO settings
CREATE POLICY "Admins can manage SEO" ON public.page_seo
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read SEO data (needed for public pages)
CREATE POLICY "Anyone can read SEO" ON public.page_seo
FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_page_seo_updated_at
BEFORE UPDATE ON public.page_seo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Pre-populate with known public pages
INSERT INTO public.page_seo (page_key, page_name, page_route, title, meta_description) VALUES
('homepage', 'Página Inicial', '/', 'WebQ - Sites Profissionais para Pequenas Empresas', 'Crie seu site profissional com a WebQ. Hospedagem, domínio, emails profissionais e suporte completo. Planos a partir de R$149/mês.'),
('plans', 'Planos e Preços', '/planos', 'Planos e Preços - WebQ', 'Conheça nossos planos de sites profissionais. Essencial, Profissional e Performance. Hospedagem, SSL, emails e suporte inclusos.'),
('blog', 'Blog', '/blog', 'Blog - WebQ', 'Dicas, tutoriais e novidades sobre sites profissionais, marketing digital e presença online para pequenas empresas.'),
('help', 'Central de Ajuda', '/ajuda', 'Central de Ajuda - WebQ', 'Encontre respostas para suas dúvidas sobre sites, emails profissionais, domínios, hospedagem e muito mais.');