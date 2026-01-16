UPDATE system_settings 
SET value = '{"title": "Sua empresa\n*precisa ser vista.*", "subtitle": "Desenvolvemos sites profissionais de alta performance que convertem visitantes em clientes. Tecnologia de ponta, design premium e hospedagem inclusa.", "cta_primary": "Falar com Especialista", "cta_secondary": "Ver Portfólio"}'::jsonb, 
    updated_at = now() 
WHERE key = 'hero_content'