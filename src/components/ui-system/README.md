# Design System — Tijolo em Capital

Componentes-padrão consumidos pelas telas `/admin/*`. A fonte única de
verdade dos tokens é [`src/lib/design-tokens.ts`](../../lib/design-tokens.ts).
**Não introduzir novos hex/font/spacing fora do `design-tokens.ts`.**

Veja todos os componentes (com cada estado) em **`/admin/design-system`**
(rota oculta no menu).

## Tokens no Tailwind

Para evitar quebrar telas legadas, os tokens entram com nomes namespaced
(não sobrescrevem utilitários padrão do Tailwind nem os tokens existentes):

| Token            | Classe Tailwind                                            |
|------------------|------------------------------------------------------------|
| Cores marca      | `text-brand-gold`, `bg-brand-goldSoft`, `brand-goldDeep`   |
| Texto (ink)      | `text-ink-900 / 700 / 500 / 300`                           |
| Fundo (creme)    | `bg-cream-50 / 100 / 200 / 300`                            |
| Semânticas       | `text-semantic-success / warning / danger / info`         |
| Fonte título     | `font-ds-display` (Fraunces)                               |
| Fonte corpo      | `font-ds-body` (Geist)                                     |
| Fonte mono       | `font-ds-mono` (JetBrains Mono — valores/tabelas)         |
| Raio             | `rounded-ds-sm / ds-md / ds-lg / ds-xl / ds-pill`         |
| Sombra           | `shadow-ds-sm / ds-md / ds-lg`                            |

## Componentes

```tsx
import {
  PageHeader, StatCard, EmptyState, DataTable,
  KanbanBoard, TimelineItem, Drawer,
} from '@/components/ui-system';
```

- **`<PageHeader title subtitle actions />`** — cabeçalho de cada tela admin.
- **`<StatCard label value delta icon loading />`** — métricas de dashboard
  (valor em fonte mono; `delta` colore verde/vermelho).
- **`<EmptyState icon title body action />`** — obrigatório em listas/tabelas vazias.
- **`<DataTable columns data loading empty onRowClick />`** — wrapper de
  `@tanstack/react-table` com loading (Skeleton) e empty embutidos.
- **`<KanbanBoard columns cards onMove />`** — Kanban genérico (`@dnd-kit/core`).
- **`<TimelineItem icon title body meta last />`** — histórico / audit log.
- **`<Drawer open onOpenChange title>`** — wrapper de `Sheet` para edição lateral.

## Princípios

1. Estética editorial-imobiliária: título serifado (Fraunces), ouro como
   acento (nunca dominante). Sem gradientes roxos, sem cantos uniformes.
2. Toda lista/tabela tem `loading` (Skeleton), `empty` (`EmptyState`) e `error`.
3. Microinterações: `240ms` em hover de Card, `150ms` em Button, `420ms` em
   entrada de Dialog/Sheet.
4. Valores financeiros em `font-ds-mono` para alinhamento vertical.
