-- Atualizar brand_creation_config com novo price_id do Stripe
UPDATE public.system_settings 
SET value = jsonb_set(value, '{stripe_price_id}', '"price_1SfXD579QmDvXBfNcUx8ZpZd"'),
    updated_at = now()
WHERE key = 'brand_creation_config';