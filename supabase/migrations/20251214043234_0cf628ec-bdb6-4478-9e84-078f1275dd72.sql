-- Add migration request email template
INSERT INTO system_email_templates (slug, name, description, trigger, subject, html_template, is_active, copy_to_admins)
VALUES (
  'migration_request_received',
  'Solicitação de Migração Recebida',
  'Email enviado automaticamente quando um cliente solicita migração de site',
  'migration_request',
  'Recebemos sua solicitação de migração - WebQ',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1E2A47;">Olá {{client_name}}!</h2>
    <p>Recebemos sua solicitação de migração do site <strong>{{current_domain}}</strong> para nossa infraestrutura premium.</p>
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1E2A47; margin-top: 0;">Próximos passos:</h3>
      <ol style="color: #334155; line-height: 1.8;">
        <li>Nossa equipe analisará seu site atual</li>
        <li>Entraremos em contato em até 24 horas úteis</li>
        <li>Apresentaremos o plano ideal para seu site</li>
        <li>Após aprovação, iniciaremos a migração</li>
      </ol>
    </div>
    <p><strong>Detalhes informados:</strong></p>
    <ul style="color: #64748b;">
      <li>Site atual: {{current_domain}}</li>
      <li>Hospedagem atual: {{current_hosting}}</li>
      <li>WhatsApp: {{whatsapp}}</li>
    </ul>
    <p style="margin-top: 30px;">Enquanto isso, você pode conhecer nossos <a href="https://webq.com.br/planos" style="color: #3B82F6;">planos de hospedagem</a>.</p>
    <p>Qualquer dúvida, entre em contato pelo WhatsApp ou responda este email.</p>
    <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe WebQ</strong></p>
  </div>',
  true,
  true
);