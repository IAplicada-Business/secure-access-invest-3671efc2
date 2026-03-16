

# Correção de responsividade — tabelas e dialogs restantes

## Problema principal
O `overflow-x-auto` nunca foi aplicado nas tabelas. Em telas pequenas as tabelas transbordam o container. Além disso, alguns dialogs ainda usam `grid-cols-2` sem breakpoint responsivo.

## Correções

### 1. Adicionar `overflow-x-auto` em todas as tabelas (11 arquivos)

Envolver cada `<Table>` com `<div className="overflow-x-auto">`:

- `src/pages/admin/AdminLinks.tsx` — 2 tabelas (linhas 159 e 215)
- `src/pages/admin/AdminClients.tsx` — 1 tabela (linha 163)
- `src/pages/admin/AdminPartners.tsx` — 1 tabela (linha 153)
- `src/pages/admin/AdminProperties.tsx` — 1 tabela (linha 174)
- `src/pages/admin/AdminDocuments.tsx` — 1 tabela (linha 227)
- `src/pages/admin/AdminSubmissions.tsx` — 1 tabela (linha 273)
- `src/pages/admin/AdminReports.tsx` — 2 tabelas (linhas 303 e 365)
- `src/pages/admin/AdminCommunications.tsx` — 2 tabelas (linhas 635 e 839)
- `src/components/finance/FinanceRevenues.tsx` — 1 tabela (linha 173)
- `src/components/finance/FinanceExpenses.tsx` — 1 tabela (linha 124)
- `src/components/finance/FinanceCommissions.tsx` — 1 tabela (linha 165)

### 2. Corrigir dialogs com `grid-cols-2` sem breakpoint

- `src/pages/admin/AdminSettings.tsx` linha 322: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `src/pages/admin/PartnerDetails.tsx` linhas 315, 338, 348: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`

