
Objetivo
- Eliminar o “espaço lateral excessivo” em todas as páginas do admin, tornando o shell do painel realmente fluido (full-width), mantendo apenas padding de respiro.

Diagnóstico (raiz do problema)
- O espaço lateral está sendo imposto globalmente pelo `AdminLayout` (não por cada subpágina):
  - `src/pages/admin/AdminLayout.tsx`
    - Header container: `mx-auto max-w-7xl ...`
    - Menu mobile container: `mx-auto max-w-7xl ...`
    - Main container: `mx-auto max-w-7xl ...`
- Como todas as subpáginas renderizam dentro de `<Outlet />`, esse limite (`max-w-7xl`) afeta todo o admin.

Plano de implementação
1) Remover o limitador de largura global no AdminLayout
- Arquivo: `src/pages/admin/AdminLayout.tsx`
- Trocar os 3 wrappers de:
  - `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- Para um container fluido:
  - `w-full px-3 sm:px-4 lg:px-6 xl:px-8`
- Aplicar nos 3 pontos:
  - Wrapper do header
  - Wrapper do nav mobile
  - Wrapper do `<main>`

2) Padronizar comportamento para evitar “quebra visual” em telas menores
- Ainda em `AdminLayout`, ajustar o `<main>` para garantir melhor adaptação:
  - manter `py-6` (ou `py-4 sm:py-6`), e adicionar `min-w-0` se necessário para evitar overflow herdado de filhos.

3) Auditoria rápida pós-ajuste (admin inteiro)
- Confirmar que não restou `max-w-*` no shell das páginas administrativas (exceto dialogs, que devem continuar com `max-w-lg/max-w-2xl`).
- Os `max-w-*` de dialogs/modais permanecem (não fazem parte do problema de espaço lateral da página).

Validação (critério de aceite)
- Desktop: conteúdo do admin ocupa muito mais área útil horizontal, sem “coluna estreita” central.
- Tablet/mobile: mantém padding lateral consistente sem cortar conteúdo.
- Navegar por: Dashboard, Imóveis, Links, Financeiro, Comunicações, Documentos, Clientes, Parceiros, Configurações e Relatórios para confirmar padrão visual uniforme.

Impacto esperado
- Correção global com alteração concentrada em 1 arquivo (`AdminLayout.tsx`), refletindo em todas as subpáginas imediatamente.
- Sem mudanças de backend e sem impacto em regras de dados/autenticação.
