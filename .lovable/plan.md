

# Sistema de Submissao de Imoveis por Corretores

## Resumo

Criar um fluxo completo para corretores parceiros submeterem imoveis via link secreto, com fila de avaliacao no admin e notificacoes automaticas.

---

## 1. Migracoes de Banco de Dados

### 1.1 Novo status `pending_review` no enum `property_status`

```sql
ALTER TYPE property_status ADD VALUE 'pending_review';
```

### 1.2 Nova tabela `submission_links` (links secretos para corretores)

```text
+------------------+-------------+----------------------------------+
| Campo            | Tipo        | Descricao                        |
+------------------+-------------+----------------------------------+
| id               | uuid PK     | gen_random_uuid()                |
| token            | text UNIQUE | Token secreto do link            |
| label            | text        | Descricao do link (ex: "Geral") |
| is_active        | boolean     | Default true                     |
| created_at       | timestamptz | now()                            |
+------------------+-------------+----------------------------------+
```

RLS: SELECT/INSERT/UPDATE/DELETE para authenticated. SELECT publico onde `is_active = true`.

### 1.3 Nova tabela `property_submissions` (dados do corretor + vinculo)

```text
+------------------------+-------------+----------------------------------------+
| Campo                  | Tipo        | Descricao                              |
+------------------------+-------------+----------------------------------------+
| id                     | uuid PK     | gen_random_uuid()                      |
| property_id            | uuid FK     | Referencia properties(id) ON DELETE CASCADE |
| submission_link_id     | uuid FK     | Referencia submission_links(id)        |
| broker_name            | text        | Nome do corretor                       |
| broker_phone           | text        | WhatsApp do corretor                   |
| broker_company         | text null   | Imobiliaria                            |
| owner_name             | text null   | Nome do proprietario                   |
| irregularity_notes     | text null   | O que esta irregular/faltando          |
| matricula_status       | text        | 'sim', 'nao', 'parcial'               |
| created_at             | timestamptz | now()                                  |
+------------------------+-------------+----------------------------------------+
```

RLS: INSERT anonimo permitido. SELECT/UPDATE/DELETE apenas admin.

### 1.4 Novos campos na tabela `properties`

Adicionar coluna `submitted_by` (uuid, nullable, FK para property_submissions) para vincular a submissao.

Nao necessario — o vinculo ja existe via property_submissions.property_id.

---

## 2. Novos Arquivos

### 2.1 `src/pages/PropertySubmission.tsx` — Formulario publico

- Rota: `/submit/:token`
- Valida token contra `submission_links` (is_active = true)
- Formulario com:
  - **Dados do imovel:** tipo (Select), endereco, bairro, cidade, valor aproximado (Input number), descricao (Textarea), upload de fotos (multiplo, para storage bucket `property-images`)
  - **Checklist de documentacao:** matricula (Select: Sim/Nao/Parcial), planta (Sim/Nao), IPTU (Sim/Nao), certidoes (Sim/Nao), campo de observacao livre sobre irregularidades
  - **Dados do corretor:** nome (required), telefone/WhatsApp (required), imobiliaria (opcional), nome do proprietario (opcional)
- Ao submeter:
  1. Insert em `properties` com status `pending_review`, dados do imovel, imagens
  2. Insert em `property_submissions` com dados do corretor + property_id
  3. Insert em `notifications` tipo `new_property_submission` com titulo e metadata
  4. Tela de sucesso com mensagem de confirmacao
- Design: usar paleta existente (primary/charcoal), Logo no header, responsivo

### 2.2 `src/pages/admin/AdminSubmissions.tsx` — Fila de avaliacao

- Nova aba no admin: "Submissoes" (icone Inbox)
- Lista imoveis com status `pending_review`, join com `property_submissions`
- Para cada item mostra: titulo, tipo, cidade, corretor, imobiliaria, data de submissao
- Ao clicar, abre dialog/pagina com todos os detalhes:
  - Fotos, endereco, valor, checklist de documentacao, observacoes de irregularidade
  - Dados do corretor
- Tres acoes:
  - **Aprovar (Rascunho):** muda status para `draft` → Julie completa os dados antes de publicar
  - **Arquivar:** muda status para `archived`
  - **Contatar Corretor:** abre WhatsApp com numero do corretor

---

## 3. Alteracoes em Arquivos Existentes

### 3.1 `src/types/database.ts`

- Adicionar `'pending_review'` ao type `PropertyStatus`
- Adicionar interfaces `SubmissionLink` e `PropertySubmission`

### 3.2 `src/App.tsx`

- Adicionar rota `/submit/:token` → `PropertySubmission`
- Adicionar rota admin `/admin/submissoes` → `AdminSubmissions`

### 3.3 `src/pages/admin/AdminLayout.tsx`

- Adicionar item "Submissoes" (icone Inbox) no `navItems`

### 3.4 `src/pages/admin/AdminProperties.tsx`

- Adicionar `pending_review: 'Aguardando Avaliação'` nos labels/cores de status
- Adicionar filtro `pending_review` no Select de status

### 3.5 `src/pages/admin/AdminDashboard.tsx`

- Adicionar card "Aguardando Avaliação" com contagem de pending_review
- Destacar visualmente se > 0

### 3.6 `src/pages/admin/AdminLinks.tsx`

- Adicionar secao/tab para gerenciar `submission_links` (links de corretores)
- Gerar token, copiar link, ativar/desativar

### 3.7 `src/components/NotificationBell.tsx`

- Adicionar tipo `new_property_submission` com icone 📋 e navegacao para `/admin/submissoes`

---

## 4. Fluxo Resumido

```text
Corretor → /submit/:token → Formulario → DB (pending_review) → Notificacao
                                                                     ↓
Julie abre admin → sino notifica → Submissoes → Avaliar → Aprovar/Arquivar/Contatar
```

---

## Notas Tecnicas

- Upload de fotos usa o bucket `property-images` ja existente (publico)
- RLS em `property_submissions`: insert anonimo, select admin only
- `submission_links` reutiliza o padrao de `access_links` (token + validacao)
- Notificacao `new_property_submission` segue o mesmo padrao de `hot_lead`
- Embla Carousel nao precisa de alteracao (ja funciona com fotos)
- Nao alterar nenhuma funcionalidade existente do catalogo de investidores

