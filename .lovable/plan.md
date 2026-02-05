
# Padronizar Icones na Cor da Marca

## Objetivo
Remover cores genéricas (verde, amarelo, azul) dos ícones e padronizar todos com a cor dourada da marca (`text-primary`).

---

## Arquivos a Modificar

### 1. `src/components/InvestmentAnalysis.tsx`

**Alterações:**
- Linha 93: `text-green-600` → `text-primary` (ícone TrendingUp do Retorno Líquido)
- Linha 96: `text-green-600` → `text-primary` (valor do Retorno Líquido)
- Linha 91: `bg-green-500/10` → `bg-primary/10` (fundo do card)
- Linha 134: barra de progresso - padronizar para usar sempre `bg-primary` em vez de cores variáveis
- Linhas 44-48: labels de score - padronizar para `text-primary` em vez de cores diferentes

### 2. `src/pages/PropertyDetails.tsx`

**Alterações:**
- Linha 280: `text-green-600` no Valor Projetado → `text-primary`
- Linha 285: `bg-green-500/10` → `bg-primary/10`
- Linha 287-288: `text-green-600` na Valorização → `text-primary`
- Linha 322: `text-yellow-500` no AlertTriangle → `text-primary`

---

## Resumo Visual das Mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| Retorno Líquido | Verde | Dourado |
| Valor Projetado | Verde | Dourado |
| Valorização | Verde | Dourado |
| Riscos Mapeados | Amarelo | Dourado |
| Indicador de Oportunidade | Verde/Azul/Amarelo/Vermelho | Sempre Dourado |

Todos os ícones passam a usar `text-primary` (dourado da marca), mantendo a identidade visual premium e sofisticada.
