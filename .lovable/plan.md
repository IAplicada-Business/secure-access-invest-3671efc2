

# Responsividade em todas as páginas admin

## Problemas identificados

1. **Tabelas sem scroll horizontal**: Todas as tabelas (`Table`) estão dentro de `Card > CardContent` sem `overflow-x-auto`, causando overflow no mobile
2. **Barras de filtro com elementos de largura fixa**: `SelectTrigger` com `w-[180px]`, `w-[160px]` não se adaptam em telas pequenas (Finance: Revenues, Expenses, Commissions)
3. **Headers título + botão sem stack**: `AdminClients`, `AdminPartners`, `AdminSubmissions` usam `flex items-center justify-between` sem `flex-wrap` ou stack vertical
4. **TabsList com overflow**: `AdminFinanceiro`, `AdminLinks`, `AdminReports` — tabs com texto longo cortam no mobile
5. **Grids de KPI cards**: `FinanceOverview` usa `grid sm:grid-cols-2 lg:grid-cols-5` — 5 colunas podem ficar apertadas em tablets

## Correções por arquivo

### AdminLayout.tsx
- Sem mudanças necessárias — já tem menu mobile funcional

### Tabelas (padrão em todos os arquivos)
- Envolver `<Table>` com `<div className="overflow-x-auto">` em:
  - `AdminProperties`, `AdminClients`, `AdminPartners`, `AdminLinks` (2 tabelas), `AdminDocuments`, `AdminReports` (2 tabelas), `AdminSubmissions`
  - `FinanceRevenues`, `FinanceExpenses`, `FinanceCommissions`

### Headers título + botão
- `AdminClients` (linha 117): trocar `flex items-center justify-between` por `flex flex-col sm:flex-row sm:items-center justify-between gap-4`
- `AdminPartners` (linha 113): idem
- `AdminSubmissions` (linha 251): idem

### Filtros com largura fixa
- `FinanceRevenues`: `SelectTrigger w-[180px]` → `w-full sm:w-[180px]`; filters wrapper `flex flex-wrap` → `flex flex-col sm:flex-row sm:flex-wrap`
- `FinanceExpenses`: idem para `w-[180px]`
- `FinanceCommissions`: `w-[160px]` e `w-[180px]` → `w-full sm:w-[160px]` e `w-full sm:w-[180px]`; filters `flex flex-wrap` → `flex flex-col sm:flex-row sm:flex-wrap`

### TabsList overflow
- `AdminFinanceiro`: adicionar `flex-wrap` ao `TabsList` ou envolver com `overflow-x-auto`
- `AdminReports`: idem para tabs "Interesse de Investidores" / "Performance de Parceiros"
- `AdminLinks`: idem

### KPI Cards
- `FinanceOverview`: grid `sm:grid-cols-2 lg:grid-cols-5` → `grid-cols-2 lg:grid-cols-5` (já funciona, mas textos de valor `text-2xl` podem ser ajustados com `text-xl sm:text-2xl`)

### Dialogs
- Já usam `max-w-lg` / `max-w-2xl` com `max-h-[90vh] overflow-y-auto` — OK
- `AdminPartners` dialog grid `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `AdminClients` dialog grid `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`

## Total: ~15 arquivos com edições pontuais (overflow wrappers, flex-col, width classes)

