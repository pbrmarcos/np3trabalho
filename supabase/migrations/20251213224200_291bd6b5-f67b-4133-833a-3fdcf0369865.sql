
-- Insert bonus delivery email template
INSERT INTO public.system_email_templates (
  slug,
  name,
  description,
  trigger,
  subject,
  html_template,
  is_active,
  copy_to_admins,
  sender_email,
  sender_name
) VALUES (
  'design_order_bonus_delivered',
  'Entrega Bônus de Design',
  'Enviado quando uma entrega bônus (versão 4 ou 5) é disponibilizada',
  'design_order_bonus_delivered',
  '🎁 Entrega Bônus Disponível - {{order_title}}',
  '<div style="text-align: center; margin-bottom: 30px;">
  <span style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">🎁 ENTREGA BÔNUS</span>
</div>

<p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Olá <strong>{{client_name}}</strong>,</p>

<p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Temos uma surpresa especial para você! 🎉</p>

<p style="font-size: 16px; color: #333333; margin-bottom: 25px;">Uma <strong>entrega bônus</strong> do seu pedido <strong>{{order_title}}</strong> está disponível. Esta é uma versão extra que preparamos com carinho para você.</p>

<div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
  <p style="font-size: 18px; color: #059669; margin: 0; font-weight: 600;">✨ Versão Bônus Disponível!</p>
  <p style="font-size: 14px; color: #047857; margin: 10px 0 0 0;">Acesse seu painel para visualizar e baixar os arquivos.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{order_url}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Ver Entrega Bônus</a>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 25px;">Esperamos que você goste desta versão especial!</p>',
  true,
  true,
  'noreply@webq.com.br',
  'WebQ Design'
),
(
  'design_order_final_delivered',
  'Pedido de Design Finalizado',
  'Enviado quando a entrega final (versão 6) é disponibilizada e o pedido é concluído',
  'design_order_final_delivered',
  '🏆 Pedido Finalizado com Sucesso - {{order_title}}',
  '<div style="text-align: center; margin-bottom: 30px;">
  <span style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">🏆 PEDIDO FINALIZADO</span>
</div>

<p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Olá <strong>{{client_name}}</strong>,</p>

<p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Parabéns! 🎉🎊</p>

<p style="font-size: 16px; color: #333333; margin-bottom: 25px;">Seu pedido <strong>{{order_title}}</strong> foi <strong>oficialmente concluído</strong>! Todas as entregas foram realizadas e seus arquivos finais estão disponíveis para download.</p>

<div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
  <p style="font-size: 20px; color: #b45309; margin: 0; font-weight: 700;">🏆 Missão Cumprida!</p>
  <p style="font-size: 14px; color: #92400e; margin: 10px 0 0 0;">Todos os arquivos do seu projeto estão prontos.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{order_url}}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Acessar Meus Arquivos</a>
</div>

<div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 25px 0;">
  <p style="font-size: 14px; color: #1e40af; margin: 0; font-weight: 600;">💡 Continue crescendo com a WebQ!</p>
  <p style="font-size: 13px; color: #1e3a8a; margin: 8px 0 0 0;">Explore nossos outros serviços de design para complementar sua marca: artes para redes sociais, papelaria, apresentações e muito mais.</p>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 25px;">Foi um prazer trabalhar com você! Estamos à disposição para futuros projetos.</p>',
  true,
  true,
  'noreply@webq.com.br',
  'WebQ Design'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  is_active = EXCLUDED.is_active,
  copy_to_admins = EXCLUDED.copy_to_admins,
  updated_at = now();
