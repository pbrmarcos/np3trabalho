-- Insert onboarding reminder email template
INSERT INTO system_email_templates (slug, name, trigger, subject, html_template, is_active, description)
VALUES (
  'onboarding_reminder',
  'Lembrete de Onboarding Pendente',
  'cron',
  'Complete seu cadastro na WebQ',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete seu cadastro</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Complete seu Cadastro</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Olá, <strong>{{client_name}}</strong>!</p>
    
    <p>Notamos que você contratou o <strong>{{plan_name}}</strong>, mas ainda não completou as informações do seu projeto.</p>
    
    <p>Para que possamos começar a desenvolver seu site, precisamos de algumas informações importantes sobre sua empresa.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{onboarding_url}}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Completar Cadastro</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">O processo leva apenas alguns minutos e é essencial para que possamos criar um site personalizado para sua empresa.</p>
    
    <p>Se tiver dúvidas, responda este email ou entre em contato pelo WhatsApp.</p>
    
    <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe WebQ</strong></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>WebQ - Sites Profissionais</p>
    <p><a href="https://webq.com.br" style="color: #6366f1;">webq.com.br</a></p>
  </div>
</body>
</html>',
  true,
  'Email automático enviado 24h após pagamento quando cliente não completou o onboarding'
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  description = EXCLUDED.description;