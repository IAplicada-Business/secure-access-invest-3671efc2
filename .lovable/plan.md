

# Aumentar logo no menu superior do admin

## Problema
A logo no header do admin usa `className="h-8 w-32"` (linha 112 do AdminLayout), que sobrescreve o tamanho base do componente Logo (`h-16 w-44`), deixando-a muito pequena.

## Solução

Alterar apenas a classe passada ao Logo na linha 112 de `h-8 w-32` para `h-10 w-36`. Isso aumenta a logo sem ultrapassar a altura do header (`h-16` = 64px), mantendo proporção e sem alterar o layout.

### Arquivo: `src/pages/admin/AdminLayout.tsx`
- Linha 112: trocar `className="h-8 w-32"` por `className="h-10 w-36"`

Nenhuma outra alteração necessária.

