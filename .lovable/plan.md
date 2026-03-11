

# Aumentar logo no menu admin

## Problema
A logo usa `h-10 w-36` (40×144px) dentro de um header `h-16` (64px). A classe passada via `className` conflita com o `base` interno do componente Logo (`h-16 w-44`) — ambas coexistem na string de classes sem merge adequado.

## Solução

1. **`AdminLayout.tsx` linha 112**: Trocar `className="h-10 w-36"` por `className="h-14 w-44"` (56px de altura, cabe no header de 64px com margem)

2. **`Logo.tsx`**: Usar `cn()` (tailwind-merge) para que a classe passada realmente sobrescreva o base, evitando conflitos:
```tsx
import { cn } from '@/lib/utils';
// ...
<span className={cn('relative inline-block overflow-hidden h-16 w-44', className)}>
```

Isso garante que qualquer `className` passada substitui corretamente os valores base, e o header mantém `h-16` sem crescer.

