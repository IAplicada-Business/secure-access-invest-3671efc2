

# Módulo de Documentos — Plano de Implementação

## 1. Banco de Dados

```sql
CREATE TYPE public.document_template_type AS ENUM ('proposta', 'contrato', 'relatorio');
CREATE TYPE public.document_template_status AS ENUM ('ativo', 'rascunho');
CREATE TYPE public.generated_document_status AS ENUM ('rascunho', 'enviado', 'assinado', 'arquivado');

CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type document_template_type NOT NULL,
  content text NOT NULL DEFAULT '',
  variables jsonb DEFAULT '[]',
  status document_template_status NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  type document_template_type NOT NULL,
  title text NOT NULL,
  variables_data jsonb DEFAULT '{}',
  file_url text,
  status generated_document_status NOT NULL DEFAULT 'rascunho',
  process_id uuid REFERENCES public.regularization_processes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS admin-only em ambas, mesmo padrão existente. Storage bucket `generated-documents` (privado).

## 2. Edge Function: `generate-pdf`

Uma backend function que:
- Recebe `template_id` + `variables_data` (ou recebe o content HTML diretamente)
- Substitui variáveis `{{nome_cliente}}` pelos valores
- Gera PDF via HTML/CSS (usando biblioteca Deno-compatible como `jspdf` ou renderização HTML)
- Salva no bucket `generated-documents`
- Retorna a URL do arquivo

Configuração em `config.toml`: `verify_jwt = false` com validação de auth no código.

**Nota**: Para a geração de PDF no Deno runtime, a abordagem mais confiável é construir o HTML com as variáveis substituídas e usar uma lib como `pdf-lib` para gerar o documento. O template HTML é armazenado no campo `content` da tabela `document_templates`.

## 3. Configurações — Templates de Documentos

Em `AdminSettings.tsx`, nova seção abaixo de "Tipos de Regularização":
- Lista de templates com nome, tipo (badge), status, quantidade de variáveis
- Dialog para criar/editar com: nome, tipo (select), status (ativo/rascunho), conteúdo (textarea com suporte a variáveis `{{...}}`), lista de variáveis (nome + obrigatória sim/não)
- Preview das variáveis detectadas automaticamente no conteúdo

## 4. Nova Rota `/admin/documentos`

Nova página `AdminDocuments.tsx`:
- Listagem de todos os documentos gerados com: título, tipo (badge), cliente vinculado, data, status, ações (visualizar, exportar PDF, arquivar)
- Filtros por tipo, status, cliente
- Botões "Nova Proposta" e "Novo Contrato" que abrem o wizard

## 5. Wizard de Geração (Proposta e Contrato)

Componente `DocumentWizard.tsx` com 4 etapas:

**Etapa 1 — Contexto**: select de cliente (busca), tipo de serviço, template a usar (filtrado por tipo)

**Etapa 2 — Campos variáveis**: renderizados dinamicamente a partir das variáveis do template selecionado. Campos especiais:
- `narrativa_caso`: textarea
- `escopo_servico`: textarea (pré-preenchido se vier de processo de regularização)
- `valor_servico`: input numérico
- `condicoes_pagamento`: select
- `prazo_entrega`: input data
- `validade_proposta`: input data
- Para contratos: objeto, cláusulas variáveis, dados do cliente (auto-preenchidos)

**Etapa 3 — Preview**: HTML renderizado com variáveis substituídas

**Etapa 4 — Geração**: chama a edge function, salva registro em `generated_documents`, toast de sucesso

## 6. Relatório por Parceiro (PDF)

Em `AdminReports.tsx`, na aba "Performance de Parceiros":
- Adicionar botão "Gerar Relatório" em cada linha da tabela
- Dialog para selecionar período (mês/trimestre/personalizado)
- Usa a mesma edge function `generate-pdf` com template tipo `relatorio`
- PDF inclui: nome do parceiro, período, clientes gerados, receita total, comissão paga/pendente

## 7. Integração com Regularizações

Em `RegularizationDetails.tsx`:
- Botão "Gerar Proposta" na aba Visão Geral
- Abre o wizard pré-preenchido com: cliente do processo, tipo "regularizacao", escopo do processo

## 8. Integração com Cliente

Em `ClientDetails.tsx`:
- Nova aba "Documentos Gerados" (ou incluir na aba Documentos existente)
- Lista documentos de `generated_documents` filtrados por `client_id`

## 9. Navegação

Em `AdminLayout.tsx`:
- Adicionar "Documentos" no header entre "Financeiro" e o dropdown "Dashboard" (que contém Relatórios)
- Ícone `FileText`
- Mobile menu atualizado

## 10. Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | 2 tabelas + enums + bucket + RLS |
| `supabase/functions/generate-pdf/index.ts` | Criar — edge function |
| `supabase/config.toml` | Adicionar config da function |
| `src/pages/admin/AdminDocuments.tsx` | Criar — hub de documentos |
| `src/components/documents/DocumentWizard.tsx` | Criar — wizard de geração |
| `src/pages/admin/AdminSettings.tsx` | Editar — seção templates |
| `src/pages/admin/AdminReports.tsx` | Editar — botão gerar relatório |
| `src/pages/admin/RegularizationDetails.tsx` | Editar — botão gerar proposta |
| `src/pages/admin/ClientDetails.tsx` | Editar — aba documentos gerados |
| `src/pages/admin/AdminLayout.tsx` | Editar — link Documentos no nav |
| `src/App.tsx` | Editar — rota `/admin/documentos` |
| `src/types/database.ts` | Editar — tipos novos |

## Ordem de implementação

1. Database (migration)
2. Edge function `generate-pdf`
3. Settings (templates)
4. `AdminDocuments.tsx` + `DocumentWizard.tsx`
5. Navegação + rotas
6. Integração com regularizações e relatórios
7. Integração com clientes

