-- Adicionar configuração de criação de marca ao system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'brand_creation_config',
  '{"price": 150, "stripe_price_id": "price_1Sb36CEXNRV7tn1dnr51n9pY", "included": "2 versões de logomarca + 2 rodadas de correções"}'::jsonb,
  'Configuração do serviço de criação de identidade visual'
)
ON CONFLICT (key) DO NOTHING;

-- Adicionar brand_creation_config à policy de visualização pública
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;

CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (key = ANY (ARRAY['plan_basic'::text, 'plan_professional'::text, 'plan_ecommerce'::text, 'hero_content'::text, 'cta_content'::text, 'brand_creation_config'::text]));