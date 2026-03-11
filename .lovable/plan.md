

# Módulo Financeiro — Plano de Implementação

## Visão geral

Criar o módulo `/admin/financeiro` com 4 abas (Visão Geral, Receitas, Despesas, Comissões), 3 novas tabelas no banco, e integrar dados reais na Performance de Parceiros nos Relatórios.

---

## 1. Banco de dados — 3 tabelas + RLS

### Migration SQL

```sql
-- Tipos
CREATE TYPE public.service_type AS ENUM ('regularizacao', 'venda_plataforma', 'consultoria', 'outro');
CREATE TYPE public.expense_category AS ENUM ('salario', 'comissao_paga', 'fornecedor', 'escritorio', 'marketing', 'outro');
CREATE TYPE public.commission_status AS ENUM ('pending', 'paid');

-- Receitas
CREATE TABLE public.revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  service_type service_type NOT NULL DEFAULT 'outro',
  amount numeric NOT NULL,
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Comissões
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  revenue_id uuid NOT NULL REFERENCES public.revenues(id) ON DELETE CASCADE,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Despesas
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL DEFAULT 'outro',
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean NOT NULL DEFAULT false,
  related_commission_id uuid REFERENCES public.commissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (admin only, mesmo padrão do resto)
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenues" ON public.revenues FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage commissions" ON public.commissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
```

---

## 2. Navegação — novo link "Financeiro" no header

**`AdminLayout.tsx`**: Adicionar link direto (como "Links") no nav bar com ícone `DollarSign`, rota `/admin/financeiro`. Adicionar no mobile menu também.

**`App.tsx`**: Adicionar rota `<Route path="financeiro" element={<AdminFinanceiro />} />` dentro do admin layout.

---

## 3. Página principal — `AdminFinanceiro.tsx`

Componente com `Tabs` (Visão Geral, Receitas, Despesas, Comissões). Cada aba será um componente separado para manter o código organizado:

### 3a. Aba Visão Geral (`FinanceOverview.tsx`)
- **5 cards no topo**: Faturamento mês atual, Despesas mês, Lucro líquido, Comissões a pagar, Faturamento mês anterior
- **Gráfico de barras** (recharts, já instalado): receita vs despesa últimos 6 meses
- **Gráfico pizza/barras**: receita por tipo de cliente (join revenues → clients → type)

### 3b. Aba Receitas (`FinanceRevenues.tsx`)
- Tabela com: data, cliente, tipo de serviço, valor, parceiro (auto do cliente), status comissão, observações
- Dialog para criar/editar receita com select de clientes; ao selecionar cliente com parceiro, calcula comissão automaticamente e mostra preview
- Ao salvar receita com parceiro → cria registro em `commissions` automaticamente
- Filtros: período, tipo serviço, parceiro, status comissão

### 3c. Aba Despesas (`FinancExpenses.tsx`)
- Tabela com: data, categoria, descrição, valor, recorrente
- Dialog para criar/editar
- Despesas tipo "Comissão paga" são criadas automaticamente (readonly nesse caso)

### 3d. Aba Comissões (`FinanceCommissions.tsx`)
- Tabela: parceiro, cliente, receita vinculada, %, valor, status, data pagamento
- **Totalizadores no topo**: total pendente, pago no mês, pago no ano
- Ação "Marcar como paga": dialog com data de pagamento → atualiza commission.status='paid' + commission.paid_at + insere despesa categoria='comissao_paga' automaticamente
- Filtros: parceiro, status, período

---

## 4. Atualizar Performance de Parceiros (`AdminReports.tsx`)

Na função `loadPartnerPerformance`:
- Buscar `revenues` agrupado por `partner_id` → somar `amount` → `total_generated`
- Buscar `commissions` onde `status='paid'` agrupado por `partner_id` → somar `amount` → `commission_paid`
- Adicionar coluna "Comissão Pendente" na tabela
- Adicionar botão "Gerar Relatório" por parceiro → gera PDF simples (usando canvas/html ou biblioteca leve) com: nome parceiro, período, clientes gerados, receita total, comissão

---

## 5. Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/AdminFinanceiro.tsx` | Criar — página principal com tabs |
| `src/components/finance/FinanceOverview.tsx` | Criar — visão geral com cards e gráficos |
| `src/components/finance/FinanceRevenues.tsx` | Criar — listagem e CRUD de receitas |
| `src/components/finance/FinanceExpenses.tsx` | Criar — listagem e CRUD de despesas |
| `src/components/finance/FinanceCommissions.tsx` | Criar — listagem e ação de pagamento |
| `src/pages/admin/AdminLayout.tsx` | Editar — adicionar nav "Financeiro" |
| `src/App.tsx` | Editar — adicionar rota financeiro |
| `src/pages/admin/AdminReports.tsx` | Editar — popular dados reais de parceiros |
| `src/types/database.ts` | Editar — adicionar tipos Revenue, Expense, Commission |

---

## Fluxo confirmado

```text
Julie fecha contrato
  → Registra receita (seleciona cliente)
  → Sistema detecta parceiro do cliente
  → Calcula comissão (rate × valor) e mostra preview
  → Salva receita + comissão pendente
  → Julie marca comissão como paga
  → Despesa "Comissão paga" gerada automaticamente
  → Visão Geral e Relatórios atualizados em tempo real
```

