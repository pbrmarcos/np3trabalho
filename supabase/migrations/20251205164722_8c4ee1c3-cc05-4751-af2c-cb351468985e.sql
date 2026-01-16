-- Create system_settings table for storing app configuration
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can view settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plan configurations
INSERT INTO public.system_settings (key, value, description) VALUES
('plan_basic', '{
  "name": "Essencial",
  "price": 149,
  "price_id": "price_1RTfnzCAyYw4LgHJQjSvuXlw",
  "product_id": "prod_SnDVD6c9Q2VLJ2",
  "description": "Para quem está começando",
  "features": ["Site One-Page Responsivo", "Hospedagem Inclusa", "1 Conta de E-mail Profissional", "Certificado SSL Gratuito", "Suporte por E-mail"]
}', 'Configurações do plano Essencial'),
('plan_professional', '{
  "name": "Profissional",
  "price": 299,
  "price_id": "price_1RTfqlCAyYw4LgHJ1ipVq6kq",
  "product_id": "prod_SnDYVsKS4TTFQa",
  "description": "Para empresas em crescimento",
  "features": ["Site Multi-páginas (até 5)", "Hospedagem Premium", "5 Contas de E-mail", "Blog/Notícias Integrado", "Otimização SEO Avançada", "Suporte Prioritário WhatsApp"],
  "popular": true
}', 'Configurações do plano Profissional'),
('plan_ecommerce', '{
  "name": "E-commerce",
  "price": 599,
  "price_id": "price_1RTfrWCAyYw4LgHJ0TxPlEeP",
  "product_id": "prod_SnDYuUyGFXaV8c",
  "description": "Para vender online",
  "features": ["Loja Virtual Completa", "Gestão Ilimitada de Produtos", "Integração com Pagamentos", "Cálculo Automático de Frete", "Painel Administrativo Completo", "Relatórios de Vendas"]
}', 'Configurações do plano E-commerce'),
('hero_content', '{
  "title": "Criamos Sites que Transformam Visitantes em Clientes",
  "subtitle": "Desenvolvemos soluções web personalizadas para impulsionar seu negócio. Design moderno, performance excepcional e suporte dedicado.",
  "cta_primary": "Começar Agora",
  "cta_secondary": "Ver Planos"
}', 'Conteúdo da seção Hero'),
('cta_content', '{
  "title": "Pronto para Transformar sua Presença Digital?",
  "subtitle": "Entre em contato conosco e descubra como podemos ajudar seu negócio a crescer online.",
  "button_text": "Falar com Especialista"
}', 'Conteúdo da seção CTA');