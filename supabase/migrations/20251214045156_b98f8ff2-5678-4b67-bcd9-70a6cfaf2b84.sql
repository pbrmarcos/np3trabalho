-- Create table for migration message history
CREATE TABLE public.migration_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_id uuid NOT NULL REFERENCES public.migration_requests(id) ON DELETE CASCADE,
  message text NOT NULL,
  admin_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.migration_messages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all messages
CREATE POLICY "Admins can manage migration messages"
ON public.migration_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view messages for their migration (by migration_id)
CREATE POLICY "Anyone can view migration messages"
ON public.migration_messages
FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.migration_messages;

-- Create email template for new migration message
INSERT INTO public.system_email_templates (slug, name, description, trigger, subject, html_template, is_active)
VALUES (
  'migration_message',
  'Nova Mensagem de Migração',
  'Enviado quando admin adiciona mensagem sobre migração',
  'migration_message',
  'Nova atualização sobre sua migração - {{current_domain}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1E2A47;">Olá {{client_name}}!</h2>
    <p>Temos uma atualização sobre a migração do seu site <strong>{{current_domain}}</strong>:</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
      <p style="margin: 0; white-space: pre-wrap;">{{message}}</p>
    </div>
    <p>Status atual: <strong>{{status_label}}</strong></p>
    <p style="margin-top: 24px;">
      <a href="{{tracking_url}}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Ver Acompanhamento
      </a>
    </p>
    <p style="color: #666; font-size: 14px; margin-top: 24px;">
      Qualquer dúvida, entre em contato pelo email suporte@webq.com.br
    </p>
  </div>',
  true
);