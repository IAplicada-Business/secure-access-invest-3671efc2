

# Corrigir RLS Policies — submission_links e property_submissions

## Problema

Todas as RLS policies nas tabelas `submission_links` e `property_submissions` estao como `RESTRICTIVE`. No PostgreSQL, policies restritivas combinam com AND — ou seja, TODAS precisam passar. Isso impede o admin de criar/visualizar links de corretores, pois a policy "Anyone can view active" e a policy "Admins can manage" precisam ambas ser verdadeiras simultaneamente.

## Solucao

Uma unica migracao SQL que:

1. **Drop** as policies existentes nas duas tabelas
2. **Recria** as mesmas policies como `PERMISSIVE` (padrao do PostgreSQL)

### Tabela `submission_links` (2 policies)

- `Admins can manage submission links` — ALL para authenticated, usando `has_role()`
- `Anyone can view active submission links` — SELECT para public, onde `is_active = true`

### Tabela `property_submissions` (2 policies)

- `Admins can manage property submissions` — ALL para authenticated, usando `has_role()`
- `Anyone can insert property submissions` — INSERT para public, com check `true`

## Arquivos alterados

Nenhum arquivo de codigo precisa mudar. Apenas uma migracao SQL.

