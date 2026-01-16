# WebQ Migration Guide

Este guia detalha o processo completo de migração do projeto WebQ de um projeto Lovable Cloud para um Supabase externo.

## Visão Geral

A migração envolve transferir:
1. **Schema do banco de dados** (tabelas, funções, triggers, RLS, indexes)
2. **Dados** (registros de todas as tabelas)
3. **Arquivos** (Storage: imagens, documentos, uploads)
4. **Código fonte** (React app + Edge Functions)
5. **Secrets** (API keys: Stripe, Resend, etc.)
6. **Usuários** (auth.users - deve ser recreado manualmente)

---

## Pré-requisitos

### No Projeto Destino (Supabase Externo)
- [ ] Projeto Supabase criado e configurado
- [ ] Acesso ao SQL Editor do Supabase
- [ ] Acesso ao Storage no dashboard
- [ ] Credenciais (URL, anon key, service role key)

### No Projeto Lovable NOVO
- [ ] Projeto criado conectado ao Supabase externo
- [ ] Connectors > Supabase configurado com as credenciais

---

## Passo 1: Exportar do Projeto Atual

### 1.1 Acessar Página de Backup
1. Navegue para `/admin/backup` no projeto atual
2. Faça login como administrador (desenvolvedor@webq.com.br recomendado)

### 1.2 Exportar Schema
1. Clique em **"Exportar Schema"**
2. Salve o arquivo `webq-schema.sql`
3. Este arquivo contém:
   - Todas as 35 tabelas com suas estruturas
   - Enum types (app_role)
   - 10+ funções (has_role, has_active_subscription, etc.)
   - Triggers para timestamps e new user
   - 50+ indexes
   - Configuração de Realtime

### 1.3 Exportar Dados
1. Clique em **"Exportar Dados"**
2. Salve o arquivo `webq-data.sql`
3. Este arquivo contém:
   - INSERT statements para todas as tabelas
   - Dados ordenados por dependência
   - `ON CONFLICT DO NOTHING` para evitar erros de duplicação

### 1.4 Exportar Inventário de Storage
1. Clique em **"Exportar Inventário"**
2. Salve o arquivo `webq-storage-inventory.json`
3. Este arquivo contém:
   - Lista de todos os arquivos em 7 buckets
   - URLs de download (públicas ou signed com 1h de validade)
   - Metadata (tamanho, tipo MIME, datas)
   - Instruções de migração

---

## Passo 2: Preparar Supabase Destino

### 2.1 Criar Buckets de Storage
No dashboard do Supabase destino, vá em **Storage** e crie os buckets:

| Bucket | Público |
|--------|---------|
| `client-logos` | ✅ Sim |
| `portfolio-screenshots` | ✅ Sim |
| `admin-media` | ✅ Sim |
| `project-files` | ❌ Não |
| `brand-files` | ❌ Não |
| `design-files` | ❌ Não |
| `onboarding-files` | ❌ Não |

### 2.2 Criar Usuários Admin
Antes de executar os SQLs, você precisa criar os usuários admin no auth.users:

1. Vá em **Authentication > Users**
2. Clique em **Add User > Create New User**
3. Crie os usuários admin:
   - `suporte@webq.com.br`
   - `atendimento@webq.com.br`
   - `desenvolvedor@webq.com.br`
4. **IMPORTANTE**: Anote os UUIDs gerados para cada usuário

### 2.3 Ajustar UUIDs no arquivo de dados
Abra `webq-data.sql` e substitua os UUIDs antigos pelos novos:
- Procure por INSERT nas tabelas `profiles` e `user_roles`
- Substitua os `user_id` pelos UUIDs dos novos usuários

---

## Passo 3: Executar Schema SQL

### 3.1 Abrir SQL Editor
1. No dashboard do Supabase, vá em **SQL Editor**
2. Crie um novo query

### 3.2 Executar Schema
1. Cole todo o conteúdo de `webq-schema.sql`
2. Execute o script
3. Verifique se não houve erros

**Erros comuns:**
- `type "app_role" already exists`: O enum já existe, pode ignorar
- `relation already exists`: Tabela já existe, pode ignorar
- `publication "supabase_realtime" does not exist`: Execute manualmente:
  ```sql
  CREATE PUBLICATION supabase_realtime;
  ```

### 3.3 Verificar Criação
Verifique no **Table Editor** se todas as 35 tabelas foram criadas.

---

## Passo 4: Importar Dados

### 4.1 Executar Data SQL
1. No SQL Editor, cole o conteúdo de `webq-data.sql`
2. Execute em partes se o arquivo for muito grande
3. Alguns erros de FK são esperados (usuários não existentes)

### 4.2 Verificar Dados
Verifique as tabelas principais:
- `system_settings` - Configurações do sistema
- `system_email_templates` - Templates de email
- `design_packages` - Pacotes de design
- `blog_posts` - Posts do blog
- `help_categories` e `help_articles` - Central de ajuda

---

## Passo 5: Migrar Arquivos de Storage

### 5.1 Download Manual
1. Abra `webq-storage-inventory.json`
2. Para cada arquivo no inventário:
   - Use a URL (`publicUrl` ou `signedUrl`) para baixar
   - URLs assinadas expiram em 1 hora!

### 5.2 Upload no Destino
1. No Storage do Supabase destino
2. Navegue até o bucket correspondente
3. Faça upload dos arquivos mantendo a estrutura de pastas

### 5.3 Atualizar URLs (se necessário)
Se as URLs mudaram, atualize nas tabelas:
- `media_files.file_url`
- `project_files.file_url`
- `portfolio_items.image_url`
- `design_delivery_files.file_url`
- `migration_messages.attachment_url`

---

## Passo 6: Copiar Código Fonte

### 6.1 No Projeto Lovable NOVO
O código fonte deve ser copiado do projeto atual para o novo.

### 6.2 Edge Functions
As Edge Functions em `supabase/functions/` serão deployadas automaticamente pelo Lovable quando você fizer push de código.

### 6.3 Verificar config.toml
Certifique-se de que `supabase/config.toml` tem o `project_id` correto do novo projeto.

---

## Passo 7: Configurar Secrets

### 7.1 Secrets Necessários
Configure os seguintes secrets no projeto destino:

| Secret | Descrição |
|--------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe |
| `RESEND_API_KEY` | API key do Resend |
| `ENCRYPTION_KEY` | Chave para criptografia de senhas |

### 7.2 Onde Configurar
- **Supabase Dashboard**: Settings > Edge Functions > Add secret
- **Lovable**: Se disponível na interface de secrets

---

## Passo 8: Testar e Validar

### 8.1 Testes Básicos
- [ ] Login como admin funciona
- [ ] Dashboard admin carrega dados
- [ ] Lista de clientes aparece
- [ ] Blog posts estão visíveis

### 8.2 Testes de Funcionalidade
- [ ] Criar novo ticket
- [ ] Upload de arquivo
- [ ] Envio de email (se Resend configurado)
- [ ] Checkout Stripe (se Stripe configurado)

### 8.3 Testes de Storage
- [ ] Imagens do portfolio carregam
- [ ] Logo do admin aparece
- [ ] Arquivos de projeto são acessíveis

---

## Troubleshooting

### Erro: "permission denied for table X"
O usuário não tem permissão. Verifique as RLS policies:
```sql
ALTER TABLE public.X ENABLE ROW LEVEL SECURITY;
-- Adicione as policies necessárias
```

### Erro: "violates foreign key constraint"
Dados referenciando registros que não existem. Execute os INSERTs na ordem de dependência ou use `ON CONFLICT DO NOTHING`.

### Erro: "function X does not exist"
Execute `webq-schema.sql` antes do `webq-data.sql`.

### Imagens não carregam
Verifique se:
1. O bucket existe e está configurado como público (se aplicável)
2. As RLS policies do storage permitem acesso
3. A URL está correta

---

## Checklist Final

- [ ] Schema criado (35 tabelas)
- [ ] Funções criadas (has_role, etc.)
- [ ] Triggers funcionando
- [ ] Dados importados
- [ ] Usuários admin criados
- [ ] Storage buckets criados
- [ ] Arquivos migrados
- [ ] Secrets configurados
- [ ] Edge Functions deployadas
- [ ] Login testado
- [ ] Funcionalidades principais testadas

---

## Contato

Em caso de problemas durante a migração, entre em contato com a equipe de desenvolvimento.
