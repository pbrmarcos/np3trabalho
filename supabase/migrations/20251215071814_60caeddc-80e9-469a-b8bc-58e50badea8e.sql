-- =============================================
-- FASE 1: Expandir client_onboarding para dados de contato completo
-- =============================================

-- Adicionar campos de contato expandidos
ALTER TABLE public.client_onboarding 
ADD COLUMN IF NOT EXISTS business_email text,
ADD COLUMN IF NOT EXISTS phone_landline text,
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_complement text,
ADD COLUMN IF NOT EXISTS address_neighborhood text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS address_zip text,
ADD COLUMN IF NOT EXISTS show_address boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS business_hours text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS youtube text,
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS is_design_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_brand_identity boolean DEFAULT false;

-- =============================================
-- FASE 2: Expandir design_orders para briefing estruturado
-- =============================================

-- Adicionar campos de briefing estruturado para pedidos de design
ALTER TABLE public.design_orders 
ADD COLUMN IF NOT EXISTS briefing_type text,
ADD COLUMN IF NOT EXISTS briefing_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_brand_identity boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS brand_colors text,
ADD COLUMN IF NOT EXISTS brand_files text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Comentários explicativos
COMMENT ON COLUMN public.design_orders.briefing_type IS 'Tipo de briefing: social, stationery, presentation, ebook, menu, invitation, brand, banner, signature';
COMMENT ON COLUMN public.design_orders.briefing_data IS 'JSON estruturado com dados específicos por tipo de briefing';
COMMENT ON COLUMN public.design_orders.has_brand_identity IS 'Se cliente já possui identidade visual/logo';
COMMENT ON COLUMN public.design_orders.brand_colors IS 'Cores da marca em hex ou descrição';
COMMENT ON COLUMN public.design_orders.brand_files IS 'Array de URLs para arquivos de marca (logo, manual, etc)';

COMMENT ON COLUMN public.client_onboarding.business_email IS 'Email comercial diferente do email de login';
COMMENT ON COLUMN public.client_onboarding.phone_landline IS 'Telefone fixo comercial';
COMMENT ON COLUMN public.client_onboarding.business_hours IS 'Horário de funcionamento em formato texto';
COMMENT ON COLUMN public.client_onboarding.is_design_only IS 'Se cliente é apenas de design (sem plano de hospedagem)';
COMMENT ON COLUMN public.client_onboarding.has_brand_identity IS 'Se cliente já possui identidade visual/logo';
COMMENT ON COLUMN public.client_onboarding.show_address IS 'Se deve exibir endereço no site';