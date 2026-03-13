

# Agrupar Documentos dentro de Comunicações como dropdown

## O que muda

Remover "Documentos" e "Comunicações" como links separados no header. Criar um dropdown "Comunicações" (ícone `MessageSquare` + `ChevronDown`) que contém dois itens:
- **Comunicações** → `/admin/comunicacoes`
- **Documentos** → `/admin/documentos`

Mesmo padrão visual dos dropdowns "Dashboard", "Imóveis" e "CRM" que já existem.

## Arquivo a editar

`src/pages/admin/AdminLayout.tsx`

### Desktop nav (linhas 183-193)
Substituir os dois links diretos (Documentos e Comunicações) por um único `DropdownMenu`:
- Trigger: botão "Comunicações" com ícone `MessageSquare` e seta `ChevronDown`
- Ativo quando rota começa com `/admin/comunicacoes` ou `/admin/documentos`
- Item 1: Comunicações (ícone `MessageSquare`) → `/admin/comunicacoes`
- Item 2: Documentos (ícone `FileText`) → `/admin/documentos`

### Mobile nav (linhas 282-287)
Substituir os dois links separados por:
- "Comunicações" como item principal (sem indentação)
- "Documentos" como sub-item (com `pl-12` indentado, igual ao padrão de Relatórios/Submissões)

