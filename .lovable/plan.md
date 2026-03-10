

# Modulo de Clientes (CRM)

Este e o maior modulo ate agora. Envolve banco de dados, storage, 4 paginas novas e integracao com o sistema existente de links/rastreamento.

## 1. Banco de Dados — 3 tabelas novas + 1 alteracao

### Tabela `clients`
```
id uuid PK, name text, type text (investor/incorporator/individual),
cpf_cnpj text nullable, phone text, email text nullable,
origin text, partner_name text nullable, status text default 'prospect',
notes text nullable, created_at timestamptz
```

### Tabela `client_documents`
```
id uuid PK, client_id uuid FK->clients, file_name text,
file_url text, category text, uploaded_at timestamptz
```

### Tabela `client_interactions`
```
id uuid PK, client_id uuid FK->clients, type text,
note text, interaction_date timestamptz, created_at timestamptz
```

### Alteracao em `access_links`
Adicionar coluna `client_id uuid nullable FK->clients`.

### RLS (todas PERMISSIVE)
- clients, client_documents, client_interactions: ALL para authenticated com `has_role(admin)`. Sem acesso publico.

### Storage
Usar o bucket `property-images` existente com subpasta `client-docs/` ou criar bucket `client-documents` (publico nao, privado com policy de admin).

**Decisao:** Criar bucket privado `client-documents` com RLS para admin apenas.

## 2. Tipos TypeScript

Adicionar em `src/types/database.ts`:
- `Client`, `ClientDocument`, `ClientInteraction`
- `ClientType = 'investor' | 'incorporator' | 'individual'`
- `ClientStatus = 'prospect' | 'active' | 'completed'`
- `InteractionType = 'meeting' | 'whatsapp' | 'email' | 'call' | 'other'`
- `DocumentCategory = 'rg' | 'cpf' | 'matricula' | 'contract' | 'proposal' | 'other'`

## 3. Paginas Novas

### `src/pages/admin/AdminClients.tsx` — Listagem
- Tabela com nome, tipo, parceiro, status, data, botao WhatsApp
- Filtros: busca por nome, select por tipo, select por status
- Botao "Novo Cliente" abre dialog de cadastro
- Mesma linguagem visual de AdminProperties/AdminLinks

### `src/pages/admin/ClientForm.tsx` — Cadastro/Edicao
- Dialog ou pagina com campos: nome, tipo, cpf/cnpj, telefone, email, origem, parceiro (texto livre), status, observacoes
- Validacao basica com estados do React

### `src/pages/admin/ClientDetails.tsx` — Pasta do Cliente
- Rota `/admin/clientes/:id`
- 4 abas internas usando componente Tabs existente:

**Aba Resumo:** Dados cadastrais, botao editar, botao WhatsApp, card de origem/parceiro

**Aba Documentos:** Upload de arquivos para bucket `client-documents`, lista com nome, categoria, data, download. Categories: RG, CPF, Matricula, Contrato, Proposta, Outro

**Aba Historico:** Timeline de interacoes. Form inline para adicionar (data, tipo, nota). Lista cronologica reversa

**Aba Imoveis Vinculados (so se tipo=investor):** Query em `page_views` JOIN `access_links` WHERE `client_id = X`. Mostra imoveis acessados com score de interesse

## 4. Navegacao

Adicionar item "Clientes" no `navItems` do `AdminLayout.tsx` (icone `Users`).

## 5. Rotas

No `App.tsx`:
```
/admin/clientes → AdminClients
/admin/clientes/:id → ClientDetails
```

## 6. Integracao com Links

No `AdminLinks.tsx`, ao criar link de investidor, adicionar campo opcional "Vincular a cliente" com select dos clientes tipo investor.

## 7. Dashboard — Card de proprietarios sem cadastro

No `AdminDashboard.tsx`, query em `property_submissions` JOIN `properties` (status=draft) para contar proprietarios (`owner_name`) que nao tem match em `clients.name`. Exibir card discreto com contagem.

## 8. Ordem de Implementacao

1. Migracao SQL (tabelas + bucket + RLS + alteracao access_links)
2. Tipos TypeScript
3. AdminClients.tsx (listagem + dialog de cadastro)
4. ClientDetails.tsx (4 abas)
5. Rotas + navegacao no layout
6. Integracao no AdminLinks (vincular cliente ao criar link)
7. Card no Dashboard

