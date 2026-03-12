

# Ajustes no Módulo de Documentos

## Problema 1: PDF visualmente básico

O edge function `generate-pdf` atual usa Helvetica pura, sem cores, sem logo, sem formatação visual. O PDF precisa transmitir o posicionamento premium da J.Imobi.

**Solução**: Reescrever a renderização no edge function com:
- Logo "J." (PNG embedado como base64 no código da function) no cabeçalho
- Barra dourada (#C9A961) decorativa no topo da página (retângulo)
- Título do documento em grafite (#3D3D3D), tamanho maior, com linha dourada abaixo
- Seções do template formatadas: parágrafos com `**texto**` renderizados como headers de seção com underline dourado
- Rodapé estilizado em todas as páginas: "J.Imobi" + data + linha separadora
- Espaçamento e margens mais generosos para leitura premium
- Cor do texto body em grafite suave, não preto puro

**Arquivo**: `supabase/functions/generate-pdf/index.ts`

## Problema 2: Preview mostra variáveis em vez do documento renderizado

O dialog de preview em `AdminDocuments.tsx` exibe `Object.entries(variables_data)` como lista chave/valor. Julie espera ver o documento como ficou.

**Solução**: Ao clicar no olho, buscar o template vinculado ao documento (`template_id`), substituir as variáveis no conteúdo do template com os valores de `variables_data`, e exibir o resultado renderizado — o mesmo preview que aparece na Etapa 3 do wizard.

**Arquivo**: `src/pages/admin/AdminDocuments.tsx` — alterar o dialog de preview para fazer fetch do template e renderizar o conteúdo processado.

## Arquivos a editar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-pdf/index.ts` | Layout premium: logo, cores dourado/grafite, header, footer, seções |
| `src/pages/admin/AdminDocuments.tsx` | Preview renderiza documento completo em vez de lista de variáveis |

