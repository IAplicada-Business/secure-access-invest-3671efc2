

# Edição pós-geração de documentos

## O que muda

Adicionar botão "Editar" na tabela de documentos (apenas para status `rascunho` ou `enviado`) que reabre o wizard com dados pré-preenchidos, e ao gerar novo PDF atualiza o registro existente em vez de criar um novo.

## Arquivos a editar

### 1. `src/components/documents/DocumentWizard.tsx`

- Adicionar prop opcional `editingDoc` com `{ id, template_id, client_id, type, title, variables_data }` 
- Quando `editingDoc` é fornecido:
  - Pré-selecionar `selectedClientId`, `selectedTemplateId`, `title` e `variablesData` a partir do doc
  - Iniciar diretamente na **etapa 2** (campos variáveis), pulando a seleção de contexto
  - Permitir voltar à etapa 1 para trocar template/cliente se necessário
- Em `handleGenerate`: se `editingDoc` existe, fazer `update` em vez de `insert` no `generated_documents` (atualizar `variables_data`, `file_url`, `template_id`, `title`)

### 2. `src/pages/admin/AdminDocuments.tsx`

- Novo estado `editingDoc: GeneratedDoc | null`
- Adicionar botão "Editar" (ícone `Pencil`) nas ações da tabela, visível apenas quando `doc.status === 'rascunho' || doc.status === 'enviado'`
- Ao clicar: setar `editingDoc` e abrir o wizard dialog
- Passar `editingDoc` como prop ao `DocumentWizard` quando presente
- Ao completar: limpar `editingDoc`, fechar dialog, recarregar lista

