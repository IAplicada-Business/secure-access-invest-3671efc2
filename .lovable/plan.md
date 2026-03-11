

# Trocar logo do menu interno para a logo completa

O componente `Logo` usa `logo-jmobi.png` com `object-cover` e `scale-[1.35]`, o que corta a imagem. Vou alterar para usar `logo-full.png` (a logo completa compartilhada na tela de login) com `object-contain`, eliminando o corte.

**Arquivo:** `src/components/Logo.tsx`
- Trocar import de `logo-jmobi.png` para `logo-full.png`
- Usar `object-contain` em vez de `object-cover` + `scale-[1.35]`

