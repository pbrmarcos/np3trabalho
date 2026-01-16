-- Insert 8 blog posts relevant to WebQ services
INSERT INTO public.blog_posts (title, slug, excerpt, content, published, published_at, author_id)
VALUES 
  (
    'Por que ter um site profissional ainda é importante em 2024?',
    'por-que-ter-site-profissional-2024',
    'Descubra por que um site bem feito é fundamental para conquistar credibilidade e vender mais.',
    '<h2>A importância de um site profissional</h2><p>Em um mundo cada vez mais digital, ter um site profissional não é mais um diferencial – é uma necessidade. Mesmo com a popularidade das redes sociais, seu site é o único canal onde você tem controle total sobre sua marca.</p><h3>Credibilidade e confiança</h3><p>Estudos mostram que 75% dos consumidores julgam a credibilidade de uma empresa com base no design do seu site. Um site desatualizado ou amador pode afastar clientes em potencial.</p><h3>Disponibilidade 24/7</h3><p>Diferente de uma loja física, seu site trabalha para você 24 horas por dia, 7 dias por semana, permitindo que clientes conheçam seus serviços a qualquer momento.</p><h3>Conclusão</h3><p>Investir em um site profissional é investir no futuro do seu negócio. A WebQ pode ajudar você a criar uma presença online que realmente converte visitantes em clientes.</p>',
    true,
    now() - interval '2 days',
    NULL
  ),
  (
    'Domínio próprio ou gratuito: qual escolher?',
    'dominio-proprio-ou-gratuito-qual-escolher',
    'Entenda as diferenças entre usar um domínio personalizado (.com.br) ou gratuito para seu negócio.',
    '<h2>Domínio próprio vs gratuito</h2><p>Uma das primeiras decisões ao criar um site é escolher o domínio. Mas qual é a melhor opção para seu negócio?</p><h3>Domínio gratuito</h3><p>Domínios gratuitos geralmente vêm com subdomínios como "suaempresa.wixsite.com". São bons para testes, mas passam uma imagem amadora.</p><h3>Domínio próprio</h3><p>Um domínio como "suaempresa.com.br" transmite profissionalismo, melhora o SEO e é mais fácil de lembrar. O investimento anual é baixo comparado aos benefícios.</p><h3>Nossa recomendação</h3><p>Para negócios sérios, sempre recomendamos domínio próprio. A WebQ ajuda você a registrar e configurar seu domínio de forma simples e rápida.</p>',
    true,
    now() - interval '5 days',
    NULL
  ),
  (
    'Como escolher a hospedagem ideal para seu site',
    'como-escolher-hospedagem-ideal-site',
    'Saiba o que avaliar antes de contratar uma hospedagem: velocidade, suporte, uptime e mais.',
    '<h2>Escolhendo a hospedagem certa</h2><p>A hospedagem é a fundação do seu site. Uma escolha errada pode resultar em lentidão, quedas e frustração.</p><h3>Fatores importantes</h3><ul><li><strong>Uptime:</strong> Busque garantia de 99.9% de disponibilidade</li><li><strong>Velocidade:</strong> Servidores SSD/NVMe são muito mais rápidos</li><li><strong>Suporte:</strong> Atendimento 24/7 em português é essencial</li><li><strong>Segurança:</strong> Firewall, backup e SSL inclusos</li></ul><h3>WebQ cuida de tudo</h3><p>Nos planos WebQ, a hospedagem está incluída com infraestrutura premium, backups automáticos e suporte especializado.</p>',
    true,
    now() - interval '8 days',
    NULL
  ),
  (
    'O que é SSL e por que seu site precisa de certificado?',
    'o-que-e-ssl-certificado-site',
    'Entenda como o SSL protege seus visitantes e melhora seu ranqueamento no Google.',
    '<h2>Entendendo o certificado SSL</h2><p>O SSL (Secure Sockets Layer) é uma tecnologia que criptografa a comunicação entre o navegador do visitante e seu site.</p><h3>Como identificar</h3><p>Sites com SSL exibem um cadeado na barra de endereço e usam "https://" ao invés de "http://". Navegadores modernos marcam sites sem SSL como "Não seguros".</p><h3>Benefícios do SSL</h3><ul><li>Proteção de dados dos visitantes</li><li>Melhor posicionamento no Google (fator de SEO)</li><li>Maior confiança dos clientes</li><li>Obrigatório para pagamentos online</li></ul><h3>SSL gratuito na WebQ</h3><p>Todos os planos WebQ incluem certificado SSL gratuito, configurado automaticamente para seu site.</p>',
    true,
    now() - interval '12 days',
    NULL
  ),
  (
    'Site one-page ou multi-páginas: qual é melhor?',
    'site-one-page-ou-multi-paginas',
    'Compare os dois formatos e descubra qual se adapta melhor ao seu tipo de negócio.',
    '<h2>One-page vs Multi-páginas</h2><p>Ambos os formatos têm vantagens. A escolha depende do seu objetivo e tipo de negócio.</p><h3>Site One-Page</h3><p>Ideal para: profissionais liberais, portfólios, landing pages. Todo conteúdo em uma única página com navegação por âncoras. Mais direto e focado em conversão.</p><h3>Site Multi-páginas</h3><p>Ideal para: empresas com muitos serviços, e-commerces, blogs. Permite organizar conteúdo extenso e melhor SEO para múltiplas palavras-chave.</p><h3>WebQ oferece ambos</h3><p>O Plano Essencial inclui site one-page, perfeito para começar. Os planos Profissional e Performance incluem múltiplas páginas para negócios que precisam de mais espaço.</p>',
    true,
    now() - interval '15 days',
    NULL
  ),
  (
    '5 erros comuns ao criar um site institucional',
    'erros-comuns-criar-site-institucional',
    'Evite armadilhas que prejudicam a imagem da sua empresa e afastam clientes.',
    '<h2>Erros que você deve evitar</h2><p>Muitas empresas cometem erros básicos que prejudicam seus resultados online. Veja os mais comuns:</p><h3>1. Design desatualizado</h3><p>Sites com visual dos anos 2000 passam impressão de empresa estagnada.</p><h3>2. Não ser responsivo</h3><p>Mais de 60% dos acessos vêm de celulares. Site que não funciona no mobile perde clientes.</p><h3>3. Informações desatualizadas</h3><p>Telefone errado, endereço antigo ou serviços que não oferece mais prejudicam sua credibilidade.</p><h3>4. Carregamento lento</h3><p>Cada segundo de espera aumenta a taxa de abandono. Performance é crucial.</p><h3>5. Falta de call-to-action</h3><p>Visitantes precisam saber o próximo passo: ligar, pedir orçamento, comprar.</p>',
    true,
    now() - interval '18 days',
    NULL
  ),
  (
    'Como o SEO pode aumentar suas vendas',
    'como-seo-aumentar-vendas',
    'Aprenda como aparecer nas primeiras posições do Google e atrair mais clientes.',
    '<h2>SEO: seu vendedor 24 horas</h2><p>SEO (Search Engine Optimization) é o conjunto de técnicas para posicionar seu site nas primeiras posições do Google.</p><h3>Por que SEO importa</h3><p>75% das pessoas nunca passam da primeira página do Google. Estar bem posicionado significa ser encontrado por quem já está buscando o que você oferece.</p><h3>Principais fatores</h3><ul><li>Conteúdo relevante e original</li><li>Site rápido e responsivo</li><li>Certificado SSL</li><li>Palavras-chave estratégicas</li><li>Links de qualidade</li></ul><h3>SEO nos planos WebQ</h3><p>Todos os sites WebQ são construídos seguindo as melhores práticas de SEO. Os planos Profissional e Performance incluem otimização avançada.</p>',
    true,
    now() - interval '22 days',
    NULL
  ),
  (
    'E-mail profissional: vale a pena investir?',
    'email-profissional-vale-pena-investir',
    'Veja como usar contato@suaempresa.com.br passa mais profissionalismo e credibilidade.',
    '<h2>A importância do e-mail profissional</h2><p>Usar gmail ou hotmail para negócios pode parecer econômico, mas passa uma imagem amadora.</p><h3>Vantagens do e-mail profissional</h3><ul><li><strong>Credibilidade:</strong> contato@suaempresa.com.br inspira mais confiança</li><li><strong>Branding:</strong> Sua marca presente em toda comunicação</li><li><strong>Organização:</strong> Separe vida pessoal e profissional</li><li><strong>Segurança:</strong> Maior proteção contra spam e phishing</li></ul><h3>E-mails inclusos nos planos</h3><p>Todos os planos WebQ incluem contas de e-mail profissional: 3 no Essencial, 5 no Profissional e ilimitados no Performance.</p>',
    true,
    now() - interval '25 days',
    NULL
  );

-- Insert homepage FAQ content in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'homepage_faq_content',
  '{
    "title": "Da hospedagem de site ao registro de domínio",
    "subtitle": "Tudo para seu projeto",
    "questions": [
      {
        "id": "1",
        "question": "O que é hospedagem de sites?",
        "answer": "Hospedagem de sites é um serviço que permite que indivíduos e organizações publiquem um website na internet. Um provedor de hospedagem fornece as tecnologias e suporte necessários para que o site seja visualizado na web."
      },
      {
        "id": "2",
        "question": "Como posso registrar um domínio para meu site?",
        "answer": "Você pode registrar um domínio através do Registro.br para domínios .com.br ou através de registradores internacionais. Se precisar, a WebQ pode ajudar com todo o processo de registro e configuração."
      },
      {
        "id": "3",
        "question": "Preciso de certificado SSL para meu site?",
        "answer": "Sim! O certificado SSL protege os dados dos seus visitantes e é essencial para ranqueamento no Google. Todos os planos WebQ incluem SSL gratuito."
      },
      {
        "id": "4",
        "question": "O que está incluído na manutenção do site?",
        "answer": "Inclui atualizações de segurança, backups automáticos, monitoramento de uptime, correção de bugs e otimizações contínuas de performance."
      },
      {
        "id": "5",
        "question": "Quanto tempo leva para criar meu site?",
        "answer": "O prazo varia de acordo com o plano: 4 dias úteis no Plano Essencial e 7 dias úteis nos Planos Profissional e Performance."
      }
    ]
  }'::jsonb,
  'FAQ content displayed on the homepage'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Update RLS policy to allow public reading of homepage_faq_content
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;

CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (key = ANY (ARRAY['plan_basic'::text, 'plan_professional'::text, 'plan_performance'::text, 'hero_content'::text, 'cta_content'::text, 'brand_creation_config'::text, 'faq_content'::text, 'portfolio_showcase_config'::text, 'homepage_faq_content'::text]));