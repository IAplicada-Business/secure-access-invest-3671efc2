

# Exibir dados da submissao do corretor no formulario de edicao

## O que muda

No `PropertyForm.tsx`, quando o imovel esta sendo editado, buscar na tabela `property_submissions` se existe uma submissao vinculada a esse `property_id`. Se existir, exibir um card somente leitura no topo do formulario com:

- Nome do corretor, telefone, imobiliaria
- Nome do proprietario
- Status da matricula informado pelo corretor
- Observacoes de irregularidades
- Botao para contatar corretor via WhatsApp

## Alteracoes

### `src/pages/admin/PropertyForm.tsx`

1. Adicionar estado `submission` (tipo `PropertySubmission | null`)
2. Na funcao `loadProperty`, apos carregar o imovel, fazer query em `property_submissions` filtrando por `property_id = id`, limit 1
3. Renderizar um card informativo (antes do formulario, apos o titulo) quando `submission` existir:
   - Icone de clipboard, titulo "Dados da Submissao"
   - Layout em grid com: corretor, telefone, imobiliaria, proprietario, matricula
   - Campo de observacoes de irregularidades em destaque (fundo amarelo claro)
   - Botao WhatsApp para contatar o corretor
   - Card com borda colorida (amber/laranja) para chamar atencao

### Nota sobre arquitetura futura

Adicionar comentario no tipo `PropertySubmission` documentando que um campo `partner_id` opcional sera adicionado quando o modulo de parceiros for construido, para vincular submissoes a parceiros cadastrados.

