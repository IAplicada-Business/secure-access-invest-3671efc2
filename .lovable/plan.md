

# Verificação e Plano de Ação

## 1. Vincular parceiro nas submissões — PRECISA DE IMPLEMENTAÇÃO

**Diagnóstico:** Confirmado. O `AdminSubmissions.tsx` não tem nenhum campo para selecionar parceiro. A mutation `approveMutation` só faz `update({ status: 'draft' })` no property — nem salva `partner_id` na tabela `property_submissions`.

**Plano de implementação:**

### `src/pages/admin/AdminSubmissions.tsx`
- Adicionar query para buscar lista de parceiros ativos (`partners` where `status = 'active'`)
- No state, adicionar `selectedPartnerId: string | null` vinculado à submissão selecionada
- No dialog de detalhes, na seção "Corretor" (antes dos botões do footer), inserir um `Select` opcional com label "Vincular Parceiro" que lista parceiros cadastrados
- Na `approveMutation`: além de atualizar `properties.status → 'draft'`, também atualizar `property_submissions.partner_id` com o parceiro selecionado (se houver)
- Na interface `SubmissionWithProperty`: adicionar campo `partner_id: string | null`

---

## 2. Aba Imóveis Vinculados só para investidores — SEM AÇÃO

Confirmado que faz sentido manter assim. A lógica depende de `access_links` que só investidores usam. Sem mudança necessária.

---

## 3. Verificação do fluxo de parceiros — ANÁLISE DO CÓDIGO

Revisei o código e a estrutura está correta:

- **Corretores Vinculados:** `PartnerDetails.tsx` linha 62 faz `select('*').eq('parent_partner_id', id)` — correto
- **Clientes Gerados:** linha 68 faz `select('*').eq('partner_id', id)` — correto
- **Performance (Relatórios):** `AdminReports.tsx` linhas 82-114 conta clientes por `partner_id` e busca última interação por `interaction_date desc` — correto
- **Último Contato:** linha 96-100 pega o primeiro resultado ordenado por `interaction_date desc` — correto

O fluxo completo funciona estruturalmente. Recomendo teste manual após implementar o item 1.

