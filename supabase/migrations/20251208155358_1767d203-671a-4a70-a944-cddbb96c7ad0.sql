-- Tabela para códigos de verificação de exclusão
CREATE TABLE public.deletion_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  code varchar(6) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT now() + interval '10 minutes',
  used boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.deletion_verification_codes ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar códigos
CREATE POLICY "Admins can manage verification codes" 
ON public.deletion_verification_codes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Índice para busca rápida
CREATE INDEX idx_deletion_codes_client_code ON public.deletion_verification_codes(client_id, code);

-- Trigger para limpar códigos expirados (opcional, mas útil)
CREATE OR REPLACE FUNCTION public.cleanup_expired_deletion_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.deletion_verification_codes 
  WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_deletion_codes_trigger
AFTER INSERT ON public.deletion_verification_codes
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_deletion_codes();