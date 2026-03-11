

# Gestão de Parceiros e Comissões

## Resumo

Criar o módulo completo de parceiros: tabelas no banco, páginas de listagem e detalhe com abas, navegação no admin, vínculo hierárquico imobiliária→corretor, migração do campo texto livre `partner_name` para FK, e relatório de performance.

## Banco de Dados (Migrações)

### 1. Tabela `partners`
```sql
CREATE TYPE partner_type AS ENUM (
  'imobiliaria','corretor_autonomo','assessor_investimento',
  'arquiteto','engenheiro','contador','outro'
);
CREATE TYPE partner_status AS ENUM ('active','inactive');

CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type partner_type NOT NULL DEFAULT 'outro',
  phone text NOT NULL,
  email text,
  affiliated_agency text,    -- imobiliária vinculada (texto livre)
  website text,
  creci text,
  commission_rate numeric,   -- percentual ex: 10
  notes text,
  status partner_status NOT NULL DEFAULT 'active',
  parent_partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
-- RLS: somente admins
```

### 2. Tabela `partner_interactions`
```sql
CREATE TABLE partner_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  note text NOT NULL,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE partner_interactions ENABLE ROW LEVEL SECURITY;
```

### 3. Ajustes em tabelas existentes
```sql
ALTER TABLE clients ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE property_submissions ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
```

RLS em `partners` e `partner_interactions`: policy ALL para `authenticated` com `has_role(auth.uid(), 'admin')`.

## Tipos TypeScript

Arquivo `src/types/database.ts` — adicionar:
- `PartnerType` (enum string union)
- `PartnerStatus` ('active' | 'inactive')
- `Partner` interface
- `PartnerInteraction` interface
- Atualizar `Client` com `partner_id?: string | null`
- Atualizar `PropertySubmission` com `partner_id?: string | null`

## Navegação

Em `AdminLayout.tsx`: transformar "Clientes" em dropdown (como Dashboard/Imóveis) contendo:
- Clientes → `/admin/clientes`
- Parceiros → `/admin/parceiros`

Mesma lógica no menu mobile.

## Páginas Novas

### `src/pages/admin/AdminPartners.tsx` — Listagem
- Tabela com colunas: Nome, Tipo, Comissão (%), Total Gerado (R$ 0,00 por ora), Status, Ação WhatsApp
- Filtros: busca por nome, tipo, status
- Botão "Novo Parceiro" abre dialog com formulário completo:
  - Nome, Tipo (select 7 opções), Telefone, E-mail, Imobiliária vinculada, Site, CRECI, Comissão (%), Observações condições, Status, Observações livres
  - Se tipo = `corretor_autonomo`: campo extra "Imobiliária vinculada" como select buscando parceiros tipo `imobiliaria`

### `src/pages/admin/PartnerDetails.tsx` — Página individual com abas
- **Resumo**: dados completos, botão WhatsApp, editar, card comissão em destaque
- **Corretores Vinculados** (só se tipo = `imobiliaria`): lista parceiros onde `parent_partner_id` = este parceiro
- **Clientes Gerados**: lista clientes onde `partner_id` = este parceiro
- **Histórico**: mesma lógica de `ClientDetails` — timeline de interações com formulário inline

## Rotas (App.tsx)

```
<Route path="parceiros" element={<AdminPartners />} />
<Route path="parceiros/:id" element={<PartnerDetails />} />
```

## Migração do campo `partner_name` em Clientes

- Em `AdminClients.tsx` e `ClientDetails.tsx`: campo "Parceiro que indicou" muda de texto livre para **combobox** que busca parceiros cadastrados, com fallback para texto livre (mantém `partner_name` como backup para indicações informais)
- Quando um parceiro é selecionado, salva `partner_id`; o `partner_name` é preenchido automaticamente com o nome do parceiro

## Relatório de Performance

Em `AdminReports.tsx` (ou sub-seção): adicionar tabela "Performance de Parceiros":
- Parceiro, Tipo, Qtd Clientes Gerados (count de `clients.partner_id`), Valor Total (R$ 0,00), Comissão Paga (R$ 0,00), Último Contato (última interação)
- Colunas de valor ficam zeradas — estrutura pronta para módulo financeiro

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| migração SQL | criar tabelas + alterar clients/property_submissions |
| `src/types/database.ts` | novos tipos |
| `src/pages/admin/AdminPartners.tsx` | **novo** |
| `src/pages/admin/PartnerDetails.tsx` | **novo** |
| `src/pages/admin/AdminLayout.tsx` | dropdown CRM |
| `src/pages/admin/AdminClients.tsx` | campo partner_id |
| `src/pages/admin/ClientDetails.tsx` | campo partner_id |
| `src/pages/admin/AdminReports.tsx` | seção performance |
| `src/App.tsx` | rotas |

