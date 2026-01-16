-- Insert FAQ content configuration
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'faq_content',
  '{
    "title": "Perguntas e Respostas",
    "subtitle": "FAQ Completo – 10+ Perguntas",
    "categories": [
      {
        "name": "Sobre o Serviço",
        "questions": [
          {
            "question": "Como funciona o processo de criação do site?",
            "answer": "Após a contratação, nossa equipe entra em contato em até 24 horas para coletar informações essenciais. O desenvolvimento segue estes prazos:\n\n• 4 dias úteis no Plano Essencial\n• 7 dias úteis nos Planos Profissional e Performance\n\nDurante todo o processo, você acompanha tudo pelo painel do cliente."
          },
          {
            "question": "Preciso ter conhecimento técnico para usar meu site?",
            "answer": "Não. Entregamos tudo pronto e configurado. Para alterações simples (textos, imagens), você usa um painel intuitivo. Para mudanças maiores, nossa equipe faz por você."
          },
          {
            "question": "O que está incluído na manutenção do site?",
            "answer": "Inclui:\n\n• Atualizações de segurança\n• Backups automáticos\n• Monitoramento de uptime\n• Correção de bugs\n• Otimizações contínuas de performance\n\nVocê não precisa lidar com nenhuma parte técnica."
          }
        ]
      },
      {
        "name": "Domínio e Hospedagem",
        "questions": [
          {
            "question": "Preciso ter um domínio próprio?",
            "answer": "Não é obrigatório. Se você já tiver um domínio, configuramos tudo. Se não tiver, ajudamos a registrar e configurar corretamente."
          },
          {
            "question": "A hospedagem está realmente inclusa no plano?",
            "answer": "Sim. Todos os planos incluem hospedagem de alta performance com:\n\n• Armazenamento NVMe\n• Certificado SSL gratuito\n• Uptime garantido de 99.9%\n• Servidor otimizado para WordPress"
          },
          {
            "question": "Posso usar meu domínio existente?",
            "answer": "Sim. Basta adicionar nosso contato técnico NELIN16 no Registro.br ou nos fornecer acesso ao DNS. Configuramos tudo para você."
          }
        ]
      },
      {
        "name": "E-mails Profissionais",
        "questions": [
          {
            "question": "Como funcionam os e-mails profissionais?",
            "answer": "Criamos contas personalizadas com seu domínio (ex: contato@suaempresa.com.br). Você acessa via webmail ou configura no Gmail/Outlook via IMAP/SMTP."
          },
          {
            "question": "Posso aumentar o número de contas de e-mail?",
            "answer": "Sim. É possível fazer upgrade de plano ou contratar contas adicionais. O plano Performance já inclui e-mails ilimitados."
          }
        ]
      },
      {
        "name": "Pagamento e Contrato",
        "questions": [
          {
            "question": "Existe taxa de setup ou fidelidade?",
            "answer": "Não. Não cobramos setup e não existe fidelidade. Você paga mês a mês por Pix ou cartão."
          },
          {
            "question": "Como funciona o cancelamento?",
            "answer": "O cancelamento pode ser feito pelo painel. O site permanece ativo até o fim do período já pago. Nenhuma multa ou taxa é cobrada."
          },
          {
            "question": "Posso trocar de plano depois?",
            "answer": "Sim.\n\n• Upgrade: é imediato e você paga apenas a diferença proporcional.\n• Downgrade: não é permitido, pois cada plano possui recursos e infraestrutura específica que não podem ser reduzidos após a contratação."
          }
        ]
      },
      {
        "name": "Alterações e Suporte",
        "questions": [
          {
            "question": "Posso solicitar alterações no site depois de pronto?",
            "answer": "Sim.\n\n• Pequenas alterações (texto, imagem) podem ser feitas por você ou solicitadas ao suporte.\n• Mudanças estruturais maiores são avaliadas individualmente."
          },
          {
            "question": "Qual o prazo de resposta do suporte?",
            "answer": "• Essencial: até 48h (E-mail)\n• Profissional: até 24h (WhatsApp Prioritário)\n• Performance: até 4h (Suporte Avançado)"
          },
          {
            "question": "Vocês fazem migração de site existente?",
            "answer": "Sim. Avaliamos seu site atual e migramos o conteúdo para nossa infraestrutura sem custo adicional. Mantemos domínio, páginas, posts e e-mails funcionando corretamente após a migração."
          }
        ]
      }
    ]
  }'::jsonb,
  'Conteúdo da seção FAQ na página de planos'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Add faq_content to the public settings RLS policy
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;
CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (key = ANY (ARRAY['plan_basic'::text, 'plan_professional'::text, 'plan_performance'::text, 'hero_content'::text, 'cta_content'::text, 'brand_creation_config'::text, 'faq_content'::text]));