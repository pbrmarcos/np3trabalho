-- Create table for dynamic cookie definitions
CREATE TABLE public.cookie_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('essential', 'preferences', 'analytics', 'marketing')),
  purpose text NOT NULL,
  duration text NOT NULL DEFAULT 'Sessão',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cookie_definitions ENABLE ROW LEVEL SECURITY;

-- Admins can manage cookie definitions
CREATE POLICY "Admins can manage cookie definitions"
ON public.cookie_definitions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active cookie definitions
CREATE POLICY "Anyone can read active cookie definitions"
ON public.cookie_definitions
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_cookie_definitions_updated_at
BEFORE UPDATE ON public.cookie_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert predefined cookies
INSERT INTO public.cookie_definitions (name, category, purpose, duration) VALUES
  ('sb-*-auth-token', 'essential', 'Autenticação do usuário e sessão segura', 'Sessão'),
  ('webq-cookie-consent', 'essential', 'Armazenar suas preferências de cookies', '1 ano'),
  ('webq_login_attempts', 'essential', 'Proteção contra ataques de força bruta', '24 horas'),
  ('webq-theme', 'preferences', 'Lembrar sua preferência de tema (claro/escuro)', 'Permanente'),
  ('sidebar:state', 'preferences', 'Lembrar o estado da barra lateral', 'Permanente'),
  ('notification-sound-*', 'preferences', 'Configurações de sons de notificação', 'Permanente'),
  ('help_session_id', 'analytics', 'Identificar sessão para métricas de ajuda', 'Sessão'),
  ('help_feedback_*', 'analytics', 'Rastrear feedback enviado em artigos', 'Permanente');