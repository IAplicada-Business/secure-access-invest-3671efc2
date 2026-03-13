

# Relatório de parceiro usando template configurável

## O que muda

No dialog de geração de relatório de parceiro (`AdminReports.tsx`), ao clicar "Gerar PDF":

1. Busca na tabela `document_templates` um template com `type = 'relatorio'` e `status = 'ativo'`
2. Se encontrar: usa o `content` do template, substituindo as variáveis `{{nome_parceiro}}`, `{{periodo}}`, `{{clientes_gerados}}`, `{{receita_total}}`, `{{comissao_paga}}`, `{{comissao_pendente}}` com os dados reais do parceiro
3. Se não encontrar: mantém o conteúdo hardcoded atual como fallback

## Arquivo a editar

`src/pages/admin/AdminReports.tsx` — apenas a função de geração dentro do `onClick` do botão "Gerar PDF" (linhas ~432-485):

- Antes de montar o `content`, fazer `supabase.from('document_templates').select('*').eq('type', 'relatorio').eq('status', 'ativo').limit(1).maybeSingle()`
- Se retornar template: usar `template.content` e substituir as variáveis com um loop sobre as chaves do mapa de variáveis
- Se não retornar: manter o conteúdo hardcoded existente
- Passar o mapa de variáveis para `variables_data` na chamada do `generate-pdf` e no insert de `generated_documents`

Nenhuma mudança de schema necessária — a tabela `document_templates` já suporta `type = 'relatorio'` e Julie já pode criar templates em Configurações.

