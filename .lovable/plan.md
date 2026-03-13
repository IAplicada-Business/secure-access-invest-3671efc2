

# Filtros Avançados no Financeiro

## Abordagem

Criar um componente reutilizavel `PeriodFilter` para o filtro de período (compartilhado entre as 3 abas), e adicionar filtros específicos em cada componente.

## Componente compartilhado: `src/components/finance/PeriodFilter.tsx`

Select com opções pré-definidas:
- `all` — Todos
- `current_month` — Mês atual
- `last_month` — Mês anterior
- `quarter` — Trimestre atual
- `custom` — Personalizado

Quando "Personalizado" é selecionado, exibe dois inputs `type="date"` (de/até) inline ao lado do select.

Exporta uma função helper `filterByPeriod(date: string, period, startDate, endDate): boolean` para uso nos componentes.

## Receitas (`FinanceRevenues.tsx`)

**Novos filtros na barra (ao lado do search existente):**
- `PeriodFilter` filtrando por `received_at`
- Select de tipo de serviço (Todos / Regularização / Venda via Plataforma / Consultoria / Outro)

**Nova coluna na tabela: "Comissão"**
- Buscar comissões junto com receitas no `loadAll` (`commissions` já é tabela existente com `revenue_id`)
- Exibir badge por receita:
  - `Pendente` (amarelo) se existe comissão com `status === 'pending'`
  - `Paga` (verde) se existe comissão com `status === 'paid'`
  - `—` (sem badge) se não existe comissão vinculada

**Lógica de filtragem:** encadear todos os filtros no `filtered` existente.

## Despesas (`FinanceExpenses.tsx`)

**Novos filtros na barra:**
- `PeriodFilter` filtrando por `expense_date`
- Select de categoria (Todos + todas as categorias do enum `ExpenseCategory`)

## Comissões (`FinanceCommissions.tsx`)

**Novos filtros na barra (já tem search + status filter):**
- `PeriodFilter` filtrando por `created_at` (ou `paid_at` para pagas)
- Select de parceiro (Todos + lista de parceiros carregada)

## Arquivos a criar/editar

1. **Criar** `src/components/finance/PeriodFilter.tsx` — componente + helper
2. **Editar** `src/components/finance/FinanceRevenues.tsx` — adicionar PeriodFilter, filtro de serviceType, coluna de comissão
3. **Editar** `src/components/finance/FinanceExpenses.tsx` — adicionar PeriodFilter, filtro de categoria
4. **Editar** `src/components/finance/FinanceCommissions.tsx` — adicionar PeriodFilter, filtro de parceiro

## Detalhes técnicos

- Todos os filtros são client-side sobre dados já carregados
- PeriodFilter calcula datas com `new Date()` e compara strings ISO
- Para a coluna de comissão em Receitas: criar um `Map<revenueId, CommissionStatus>` a partir dos dados de `commissions` já existentes na base
- Usar valor `"all"` nos selects de filtro (nunca string vazia, conforme constraint do projeto)

