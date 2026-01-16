# Guideline de Tratamento de Erros e UX - WebQ

## Princípios Fundamentais

### 1. Hierarquia de Erros
- **Críticos**: Falhas que impedem uso do sistema (auth, conexão DB)
- **Operacionais**: Erros em operações específicas (falha ao salvar, carregar)
- **Validação**: Inputs inválidos do usuário

### 2. Componentes Padrão

#### ErrorState Component
Usar para erros de carregamento de dados em páginas/seções.

```tsx
// Variantes disponíveis:
<ErrorState variant="default" />   // Página inteira com ilustração
<ErrorState variant="compact" />   // Card menor para seções
<ErrorState variant="inline" />    // Linha única para listas
```

#### Toast (Sonner)
Usar para feedback de ações do usuário.

```tsx
toast.success("Salvo com sucesso");      // Ações concluídas
toast.error("Erro ao salvar");           // Falhas em ações
toast.info("Processando...");            // Informativo
```

### 3. Hook useQueryWithError
Padroniza tratamento de erros em queries React Query.

```tsx
const { data, isLoading, hasError, retry } = useQueryWithError({
  queryKey: ['my-data'],
  queryFn: fetchData,
  errorMessage: "Erro ao carregar dados",
  showToast: true, // default: true
});
```

## Mensagens de Erro

### Estrutura
- **Título**: Curto, descreve o problema (ex: "Erro ao carregar pedidos")
- **Mensagem**: Explica e sugere ação (ex: "Verifique sua conexão e tente novamente")

### Exemplos por Contexto

| Contexto | Título | Mensagem |
|----------|--------|----------|
| Carregamento | "Erro ao carregar dados" | "Não foi possível carregar. Tente novamente." |
| Salvamento | "Erro ao salvar" | "Suas alterações não foram salvas. Tente novamente." |
| Autenticação | "Sessão expirada" | "Faça login novamente para continuar." |
| Rede | "Sem conexão" | "Verifique sua internet e tente novamente." |
| Validação | "Dados inválidos" | Mensagem específica do campo |

## Validação Zod (Edge Functions)

### Estrutura Padrão
```typescript
const InputSchema = z.object({
  email: z.string()
    .trim()
    .min(1, { message: "Email é obrigatório" })
    .email({ message: "Email inválido" })
    .max(255, { message: "Email muito longo" }),
  
  name: z.string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome muito longo" })
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, { message: "Nome contém caracteres inválidos" }),
});
```

### Resposta de Erro Padronizada
```typescript
// Erro de validação (400)
{ success: false, error: "Dados inválidos", details: zodError.errors }

// Erro de autenticação (401)
{ success: false, error: "Não autorizado" }

// Erro interno (500)
{ success: false, error: "Erro interno do servidor" }
```

## Testes Recomendados

### Validações Zod - O que testar:

```typescript
// 1. Campos obrigatórios
test('rejeita quando campo obrigatório está vazio', () => {
  expect(() => schema.parse({ email: '' })).toThrow();
});

// 2. Formatos válidos
test('aceita email válido', () => {
  expect(schema.parse({ email: 'test@example.com' })).toBeDefined();
});

// 3. Limites de tamanho
test('rejeita email muito longo', () => {
  const longEmail = 'a'.repeat(300) + '@test.com';
  expect(() => schema.parse({ email: longEmail })).toThrow();
});

// 4. Sanitização (trim)
test('remove espaços extras', () => {
  const result = schema.parse({ email: '  test@example.com  ' });
  expect(result.email).toBe('test@example.com');
});

// 5. Caracteres especiais/injection
test('rejeita caracteres maliciosos', () => {
  expect(() => schema.parse({ name: '<script>alert(1)</script>' })).toThrow();
});
```

### Cenários de Teste por Edge Function

#### create-checkout
- [ ] plan_id válido (essencial, profissional, performance)
- [ ] billing_period válido (monthly, 6month, 12month, 24month)
- [ ] promo_code opcional com formato válido
- [ ] brand_creation boolean
- [ ] onboarding_id UUID válido quando presente

#### create-design-order-checkout
- [ ] package_id obrigatório e não vazio
- [ ] briefing_type válido (pontual, criativo)
- [ ] terms_accepted deve ser true
- [ ] Arrays (inspiration_urls, brand_files) com URLs válidas
- [ ] brand_colors formato válido quando presente

## Checklist de Implementação

### Novas Páginas
- [ ] Usar `useQueryWithError` para queries principais
- [ ] Adicionar `ErrorState` com variante apropriada
- [ ] Incluir botão de retry funcional
- [ ] Mensagens em português, claras e acionáveis

### Novas Edge Functions
- [ ] Schema Zod com mensagens em português
- [ ] Validação no início da função
- [ ] Logging de erros com contexto
- [ ] Resposta padronizada de erro

### Formulários
- [ ] Validação client-side com react-hook-form + zod
- [ ] Feedback visual em campos inválidos
- [ ] Toast de sucesso/erro após submit
- [ ] Disabled state durante loading
