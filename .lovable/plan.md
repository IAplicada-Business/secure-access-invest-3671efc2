
# Plano de Melhorias no Catálogo de Imóveis

## Visão Geral
Vou ajustar a página de detalhes do imóvel para ter fundo claro (igual ao catálogo), adicionar mais imóveis mockados ao banco de dados e incluir uma nova seção que auxilie na tomada de decisão do investidor.

---

## 1. Correção do Fundo da Página de Detalhes

Atualmente a página `PropertyDetails.tsx` usa `bg-charcoal` (fundo escuro). Vou alterar para `bg-background` (fundo claro) para manter consistência visual com o catálogo.

**Alterações em PropertyDetails.tsx:**
- Container principal: `bg-charcoal` → `bg-background`
- Header: `border-charcoal-light bg-charcoal/95` → `border-border bg-background/95`
- Texto do título: `text-white` → `text-foreground`
- Loading state: `bg-charcoal` → `bg-background`
- CTA fixo no rodapé: `border-charcoal-light bg-charcoal/95` → `border-border bg-background/95`
- Link "Voltar": `hover:text-white` → `hover:text-foreground`

---

## 2. Novos Imóveis Mockados (4 adicionais)

Vou inserir mais 4 propriedades variadas no banco de dados com imagens geradas por IA:

| Tipo | Título | Localização | Aquisição | Valorização |
|------|--------|-------------|-----------|-------------|
| Casa | Casa Colonial em Moema | São Paulo - Moema | R$ 450.000 | +65% |
| Apartamento | Cobertura Duplex - Perdizes | São Paulo - Perdizes | R$ 680.000 | +52% |
| Terreno | Lote Residencial Alto de Pinheiros | São Paulo - Alto de Pinheiros | R$ 320.000 | +78% |
| Comercial | Galpão Industrial - Zona Leste | São Paulo - Mooca | R$ 890.000 | +45% |

---

## 3. Nova Seção: Análise de Investimento

Vou adicionar uma seção chamada **"Análise de Investimento"** na página de detalhes do imóvel com informações que facilitam a decisão de compra:

**Componentes da nova seção:**

```text
┌─────────────────────────────────────────────────────────────┐
│  📊 ANÁLISE DE INVESTIMENTO                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Investimento    │  │ Retorno         │                  │
│  │ Total           │  │ Líquido         │                  │
│  │ R$ 425.000      │  │ R$ 225.000      │                  │
│  │ (Aquisição +    │  │ (Após           │                  │
│  │ Regularização)  │  │ regularização)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ ROI             │  │ Rentabilidade   │                  │
│  │ Projetado       │  │ Mensal          │                  │
│  │ 52,9%           │  │ ~4,4%           │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎯 Indicador de Oportunidade                        │   │
│  │ ████████████████████████░░░░░░░░░░  72% EXCELENTE  │   │
│  │ Baseado em valorização, prazo e risco               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Métricas calculadas automaticamente:**
- **Investimento Total**: Aquisição + Regularização
- **Retorno Líquido Projetado**: Valor Projetado - Investimento Total
- **ROI (Return on Investment)**: (Retorno Líquido / Investimento Total) × 100
- **Rentabilidade Mensal Estimada**: ROI / Prazo em meses
- **Indicador de Oportunidade**: Score visual baseado em múltiplos fatores (valorização, prazo, nível de risco)

---

## Detalhes Técnicos

### Arquivos a modificar:
1. **`src/pages/PropertyDetails.tsx`** - Fundo claro + nova seção de análise
2. **Banco de dados** - Inserção de 4 novos imóveis
3. **`public/images/`** - Geração de 4 novas imagens de imóveis

### Cálculo do Indicador de Oportunidade:
```
Score = (Valorização × 0.4) + (InversoPrazo × 0.3) + (InversoRisco × 0.3)

Onde:
- Valorização: % de valorização normalizada (0-100)
- InversoPrazo: Quanto menor o prazo, maior a pontuação
- InversoRisco: "baixo" = 90, "médio" = 60, "alto" = 30
```

### Classificação:
- 80-100: "EXCELENTE" (verde)
- 60-79: "BOM" (azul)
- 40-59: "MODERADO" (amarelo)
- 0-39: "RISCO ALTO" (vermelho)

