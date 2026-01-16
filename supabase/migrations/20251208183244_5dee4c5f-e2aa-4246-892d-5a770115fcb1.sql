-- Create table for email templates
CREATE TABLE public.system_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  trigger text NOT NULL,
  subject text NOT NULL,
  html_template text NOT NULL,
  is_active boolean DEFAULT true,
  copy_to_admins boolean DEFAULT false,
  sender_email text DEFAULT 'noreply@webq.com.br',
  sender_name text DEFAULT 'WebQ Sistema',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin management
CREATE POLICY "Admins can manage email templates"
  ON public.system_email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_system_email_templates_updated_at
  BEFORE UPDATE ON public.system_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing and planned email templates
INSERT INTO public.system_email_templates (slug, name, description, trigger, subject, html_template, sender_email, sender_name) VALUES
('deletion_code', 'Código de Exclusão', 'Email com código de 6 dígitos para confirmar exclusão de cliente', 'Administrador solicita exclusão de cliente', '⚠️ Código de Verificação para Exclusão de Cliente', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f; text-align: center;">Código de Verificação</h1>
  <p>Olá,</p>
  <p>Foi solicitada a exclusão do cliente <strong>{{client_name}}</strong> ({{client_email}}).</p>
  <p>Use o código abaixo para confirmar a exclusão:</p>
  <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">{{code}}</span>
  </div>
  <p style="color: #666; font-size: 14px;">Este código expira em 10 minutos.</p>
  <p style="color: #dc2626; font-size: 14px;"><strong>⚠️ Atenção:</strong> Esta ação é irreversível e excluirá todos os dados do cliente.</p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema'),

('welcome_client', 'Boas-vindas ao Cliente', 'Email de boas-vindas enviado após conclusão do cadastro e pagamento', 'Cliente completa cadastro e pagamento', '🎉 Bem-vindo à WebQ!', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f; text-align: center;">Bem-vindo à WebQ! 🎉</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Obrigado por escolher a WebQ para criar seu site profissional!</p>
  <p>Recebemos suas informações e nossa equipe já está trabalhando no seu projeto.</p>
  <h3 style="color: #1e3a5f;">Próximos passos:</h3>
  <ol>
    <li>Nossa equipe entrará em contato em até 24 horas</li>
    <li>Você receberá atualizações sobre o progresso do seu site</li>
    <li>Acompanhe tudo pelo seu painel em {{dashboard_url}}</li>
  </ol>
  <p>Qualquer dúvida, estamos à disposição!</p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema'),

('ticket_created', 'Ticket Criado', 'Confirmação de abertura de novo ticket de suporte', 'Cliente abre novo ticket', '📩 Ticket #{{ticket_id}} criado com sucesso', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f;">Ticket Recebido!</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Recebemos seu ticket e nossa equipe responderá em breve.</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Ticket:</strong> #{{ticket_id}}</p>
    <p><strong>Assunto:</strong> {{ticket_title}}</p>
    <p><strong>Projeto:</strong> {{project_name}}</p>
  </div>
  <p>Você pode acompanhar o status pelo seu painel.</p>
</div>', 'suporte@webq.com.br', 'WebQ Suporte'),

('ticket_response', 'Resposta de Ticket', 'Notificação de nova resposta no ticket', 'Administrador responde ticket do cliente', '💬 Nova resposta no ticket #{{ticket_id}}', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f;">Nova Resposta!</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Há uma nova resposta no seu ticket:</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Ticket:</strong> #{{ticket_id}} - {{ticket_title}}</p>
    <p style="margin-top: 10px;">{{response_preview}}</p>
  </div>
  <p><a href="{{ticket_url}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Resposta Completa</a></p>
</div>', 'suporte@webq.com.br', 'WebQ Suporte'),

('ticket_resolved', 'Ticket Resolvido', 'Notificação de que o ticket foi marcado como resolvido', 'Administrador marca ticket como resolvido', '✅ Ticket #{{ticket_id}} resolvido', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #22c55e;">Ticket Resolvido! ✅</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Seu ticket foi marcado como resolvido:</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Ticket:</strong> #{{ticket_id}}</p>
    <p><strong>Assunto:</strong> {{ticket_title}}</p>
  </div>
  <p>Se precisar de mais ajuda, é só abrir um novo ticket!</p>
</div>', 'suporte@webq.com.br', 'WebQ Suporte'),

('project_status_update', 'Atualização de Status', 'Notificação de mudança de status do projeto', 'Status do projeto é alterado pelo administrador', '🚀 Atualização no seu projeto: {{project_name}}', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f;">Atualização do Projeto!</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>O status do seu projeto foi atualizado:</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Projeto:</strong> {{project_name}}</p>
    <p><strong>Novo Status:</strong> <span style="color: #3b82f6; font-weight: bold;">{{new_status}}</span></p>
  </div>
  <p>Acompanhe o progresso pelo seu painel.</p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema'),

('payment_success', 'Pagamento Confirmado', 'Confirmação de pagamento recebido via Stripe', 'Pagamento via Stripe é confirmado', '✅ Pagamento confirmado!', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #22c55e;">Pagamento Confirmado! ✅</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Recebemos seu pagamento com sucesso!</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Plano:</strong> {{plan_name}}</p>
    <p><strong>Valor:</strong> R$ {{amount}}</p>
    <p><strong>Data:</strong> {{payment_date}}</p>
  </div>
  <p>Obrigado por continuar conosco!</p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema'),

('payment_failed', 'Falha no Pagamento', 'Alerta de falha no pagamento da assinatura', 'Pagamento via Stripe falha', '⚠️ Problema com seu pagamento', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #dc2626;">Atenção: Problema no Pagamento ⚠️</h1>
  <p>Olá <strong>{{client_name}}</strong>,</p>
  <p>Não conseguimos processar seu pagamento.</p>
  <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
    <p><strong>Plano:</strong> {{plan_name}}</p>
    <p><strong>Motivo:</strong> {{failure_reason}}</p>
  </div>
  <p>Por favor, atualize seus dados de pagamento para evitar interrupção no serviço.</p>
  <p><a href="{{payment_url}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Atualizar Pagamento</a></p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema'),

('file_uploaded', 'Arquivo Enviado', 'Notificação quando cliente envia novo arquivo', 'Cliente faz upload de arquivo no projeto', '📎 Novo arquivo recebido: {{file_name}}', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e3a5f;">Novo Arquivo Recebido! 📎</h1>
  <p>O cliente <strong>{{client_name}}</strong> enviou um novo arquivo:</p>
  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Projeto:</strong> {{project_name}}</p>
    <p><strong>Arquivo:</strong> {{file_name}}</p>
    <p><strong>Tipo:</strong> {{file_type}}</p>
  </div>
  <p><a href="{{file_url}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Arquivo</a></p>
</div>', 'noreply@webq.com.br', 'WebQ Sistema');