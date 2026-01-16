-- Add email templates for design order system
INSERT INTO public.system_email_templates (slug, name, trigger, subject, html_template, description, is_active) VALUES
(
  'design_order_created',
  'Novo Pedido de Design',
  'design_order',
  'Novo pedido de design #{{order_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1E2A47 0%, #2a3a5f 100%); padding: 30px 20px; text-align: center;">
      <img src="{{logo_url}}" alt="WebQ" style="height: 40px; margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Novo Pedido de Design</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Olá!</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Um novo pedido de design foi recebido:</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Pedido:</strong> #{{order_id}}</p>
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Cliente:</strong> {{client_name}}</p>
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Categoria:</strong> {{category_name}}</p>
        <p style="margin: 0; color: #333;"><strong>Pacote:</strong> {{package_name}}</p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_url}}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Pedido</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">Este é um email automático. Não responda.</p>
      <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">© WebQ - Todos os direitos reservados</p>
    </div>
  </div>',
  'Email enviado aos admins quando um novo pedido de design é criado',
  true
),
(
  'design_order_delivered',
  'Entrega de Design Disponível',
  'design_order',
  'Sua entrega de design está pronta! 🎨',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1E2A47 0%, #2a3a5f 100%); padding: 30px 20px; text-align: center;">
      <img src="{{logo_url}}" alt="WebQ" style="height: 40px; margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Sua Entrega Está Pronta!</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Olá, {{client_name}}!</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Temos ótimas notícias! A <strong>Versão {{version_number}}</strong> do seu pedido <strong>{{package_name}}</strong> está pronta para sua análise.</p>
      <div style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">📦 Nova versão disponível!</p>
      </div>
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Acesse seu painel para baixar os arquivos e nos enviar seu feedback:</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{client_url}}" style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Entrega</a>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">Se precisar de ajustes, você pode solicitar correções diretamente pelo painel.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">Este é um email automático. Não responda.</p>
      <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">suporte@webq.com.br | © WebQ</p>
    </div>
  </div>',
  'Email enviado ao cliente quando uma entrega de design está disponível',
  true
),
(
  'design_order_approved',
  'Pedido de Design Aprovado',
  'design_order',
  'Cliente aprovou o pedido #{{order_id}} ✅',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 20px; text-align: center;">
      <img src="{{logo_url}}" alt="WebQ" style="height: 40px; margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pedido Aprovado! 🎉</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Olá!</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Ótimas notícias! O cliente <strong>{{client_name}}</strong> aprovou o pedido de design:</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Pedido:</strong> #{{order_id}}</p>
        <p style="margin: 0; color: #333;"><strong>Pacote:</strong> {{package_name}}</p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_url}}" style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Pedido</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">Este é um email automático. Não responda.</p>
      <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">© WebQ - Todos os direitos reservados</p>
    </div>
  </div>',
  'Email enviado aos admins quando cliente aprova um pedido de design',
  true
),
(
  'design_order_revision_requested',
  'Correção Solicitada em Pedido de Design',
  'design_order',
  'Cliente solicitou correção no pedido #{{order_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
      <img src="{{logo_url}}" alt="WebQ" style="height: 40px; margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Correção Solicitada</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">Olá!</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6;">O cliente <strong>{{client_name}}</strong> solicitou correção na <strong>Versão {{version_number}}</strong> do pedido:</p>
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Pedido:</strong> #{{order_id}}</p>
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Pacote:</strong> {{package_name}}</p>
        <p style="margin: 0; color: #333;"><strong>Comentário do cliente:</strong></p>
        <p style="margin: 10px 0 0 0; color: #666; font-style: italic;">"{{comment}}"</p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_url}}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Pedido</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">Este é um email automático. Não responda.</p>
      <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">© WebQ - Todos os direitos reservados</p>
    </div>
  </div>',
  'Email enviado aos admins quando cliente solicita correção em pedido de design',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;