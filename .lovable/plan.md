

# Ajustes no módulo de Comunicações

## 1. Filtros na listagem

Adicionar acima da tabela uma barra com:
- **Input de busca** por texto (filtra por título)
- **Select de status** (Todos / Rascunho / Pronta / Enviada)

Filtragem client-side sobre o array `communications` já carregado.

## 2. Feedback de contatos sem telefone

Na etapa 4 (Destinatários), ao carregar contatos:
- Separar contatos **com** telefone (lista normal) e **sem** telefone
- Exibir um alerta amarelo acima da tabela: "X contato(s) excluído(s) por não ter telefone cadastrado"
- Botão "Ver quais" que expande a lista dos nomes excluídos

Isso garante que Julie saiba exatamente quem ficou de fora.

## Arquivo a editar

`src/pages/admin/AdminCommunications.tsx`:
- Adicionar estados `filterStatus` e `filterSearch`
- Adicionar estado `contactsWithoutPhone` no loadContacts
- Filtrar `communications` antes de renderizar na tabela
- Adicionar barra de filtros entre o header e o Card da listagem
- Adicionar alerta de contatos excluídos no renderStep4

