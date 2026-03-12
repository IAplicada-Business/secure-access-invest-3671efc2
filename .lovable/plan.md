

# Módulo de Regularizações — Plano de Implementação

## 1. Banco de dados — 5 novas tabelas

```sql
-- Enum de status
CREATE TYPE public.regularization_status AS ENUM (
  'nova', 'em_analise', 'proposta_enviada', 'em_execucao', 'concluida', 'arquivada'
);
CREATE TYPE public.checklist_item_status AS ENUM ('pendente', 'recebido', 'nao_se_aplica');

-- Tipos de regularização (gerenciados em Configurações)
CREATE TABLE public.regularization_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  checklist_template jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Processos de regularização
CREATE TABLE public.regularization_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  property_submission_id uuid REFERENCES public.property_submissions(id) ON DELETE SET NULL,
  title text NOT NULL,
  type_id uuid REFERENCES public.regularization_types(id) ON DELETE SET NULL,
  status regularization_status NOT NULL DEFAULT 'nova',
  address text,
  property_type text,
  estimated_value numeric,
  estimated_completion date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist
CREATE TABLE public.regularization_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  description text NOT NULL,
  status checklist_item_status NOT NULL DEFAULT 'pendente',
  received_at date,
  notes text
);

-- Documentos do processo
CREATE TABLE public.regularization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Histórico / interações
CREATE TABLE public.regularization_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  note text NOT NULL,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  is_automatic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Storage bucket: `regularization-documents` (privado), mesmo padrão do `client-documents`.

RLS: admin-only em todas as tabelas (mesmo padrão existente com `has_role`).

---

## 2. Configurações — Tipos de Regularização

Em `AdminSettings.tsx`, adicionar seção "Tipos de Regularização":
- Lista dos tipos cadastrados com nome, descrição e quantidade de itens no checklist
- Botão "Novo Tipo" abre dialog com: nome, descrição, lista editável de itens do checklist padrão
- Editar/desativar tipos existentes

---

## 3. Aba "Regularizações" no ClientDetails

Em `ClientDetails.tsx`:
- Adicionar 5a aba "Regularizações" (visível para todos os tipos de cliente)
- Lista processos do cliente com: título, tipo, status (badge colorido), data abertura, botão ver detalhes
- Botão "Novo Processo" abre dialog: título, tipo de regularização (select dos tipos cadastrados), endereço, tipo imóvel, valor estimado, prazo, observações
- Ao salvar, cria o processo e pré-preenche o checklist a partir do `checklist_template` do tipo selecionado

---

## 4. Página de detalhes do processo

Novo arquivo `src/pages/admin/RegularizationDetails.tsx`, rota `/admin/regularizacoes/:id`.

4 abas internas:

**Visão Geral**: dados do imóvel, tipo de regularização, status atual com select para mudar (mudança gera registro automático no histórico), datas, observações editáveis.

**Checklist**: itens com description, status (Pendente/Recebido/N/A), data de recebimento, observação. Julie marca cada item. Pode adicionar/remover itens.

**Documentos**: upload/download/delete de arquivos no bucket `regularization-documents`. Categorias: Matrícula, Planta, IPTU, Certidão, Formulário, Proposta, Contrato, Outro.

**Histórico**: timeline com registros automáticos (mudança de status) e manuais (reunião, ligação, visita ao cartório). Formulário para adicionar nova interação.

---

## 5. Conexão com submissões

No `AdminSubmissions.tsx`, ao aprovar uma submissão, adicionar botão "Criar Regularização" no dialog (ou após aprovação):
- Abre dialog pré-preenchido com dados do imóvel (endereço, tipo, valor, checklist de documentação do corretor)
- Julie seleciona cliente + tipo de regularização
- Salva processo com `property_submission_id` vinculado

---

## 6. Card no Dashboard

Em `AdminDashboard.tsx`, adicionar card "Regularizações Ativas" com contagem de processos com status != 'concluida' e != 'arquivada', e destaque para processos sem atualização há mais de 7 dias.

---

## 7. Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar 5 tabelas + enum + storage bucket + RLS |
| `src/pages/admin/RegularizationDetails.tsx` | Criar — página de detalhes com 4 abas |
| `src/pages/admin/AdminSettings.tsx` | Editar — seção tipos de regularização |
| `src/pages/admin/ClientDetails.tsx` | Editar — aba Regularizações |
| `src/pages/admin/AdminSubmissions.tsx` | Editar — botão "Criar Regularização" |
| `src/pages/admin/AdminDashboard.tsx` | Editar — card regularizações ativas |
| `src/App.tsx` | Editar — rota `/admin/regularizacoes/:id` |
| `src/types/database.ts` | Editar — tipos novos |

