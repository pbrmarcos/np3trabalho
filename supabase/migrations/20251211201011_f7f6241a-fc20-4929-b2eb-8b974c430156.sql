-- Create timeline_messages table for admin messages to clients
CREATE TABLE public.timeline_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  project_id UUID REFERENCES public.client_projects(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_messages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all messages
CREATE POLICY "Admins can manage all timeline messages"
ON public.timeline_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clients can view their own messages
CREATE POLICY "Clients can view their own timeline messages"
ON public.timeline_messages
FOR SELECT
USING (auth.uid() = client_id);

-- Create index for faster queries
CREATE INDEX idx_timeline_messages_client_id ON public.timeline_messages(client_id);
CREATE INDEX idx_timeline_messages_project_id ON public.timeline_messages(project_id);

-- Insert admin_message email template
INSERT INTO public.system_email_templates (slug, name, description, trigger, subject, html_template, is_active, copy_to_admins)
VALUES (
  'admin_message',
  'Mensagem do Administrador',
  'Email enviado quando um administrador envia uma mensagem direta ao cliente',
  'admin_sends_message',
  'Nova mensagem da WebQ sobre seu projeto',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1E2A47;">Nova Mensagem da WebQ</h2>
    <p>Olá {{client_name}},</p>
    <p>Você recebeu uma nova mensagem sobre o projeto <strong>{{project_name}}</strong>:</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #333333;">{{message}}</p>
    </div>
    <p>Enviado por: <strong>{{admin_name}}</strong></p>
    <p style="margin-top: 24px;">
      <a href="{{dashboard_url}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar Dashboard</a>
    </p>
    <p style="color: #666; font-size: 14px; margin-top: 24px;">Atenciosamente,<br>Equipe WebQ</p>
  </div>',
  true,
  false
);