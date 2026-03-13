

# Automação: Contrato Assinado → Receita + Comissão

## O que muda

Quando o status de um documento é alterado para "Assinado" no hub de documentos, em vez de atualizar imediatamente, o sistema abre um dialog de confirmação que permite registrar uma receita automaticamente.

## Fluxo

1. Select de status muda para "assinado" → intercepta antes de salvar
2. Abre dialog com: título do documento, cliente vinculado, campo de valor (pré-preenchido de `variables_data.valor_servico` ou `variables_data.valor_total`), data de recebimento (padrão: hoje), tipo de serviço (padrão: `regularizacao` para contratos)
3. Se o cliente tem parceiro com `commission_rate > 0`, mostra preview da comissão (mesmo card que já existe em FinanceRevenues)
4. Ao confirmar: atualiza status do documento → insere em `revenues` → insere em `commissions` se aplicável → toast com detalhes
5. Botão "Apenas marcar como assinado" para casos sem receita vinculada

## Arquivo a editar

`src/pages/admin/AdminDocuments.tsx`:

- Alterar `handleStatusChange`: quando `newStatus === 'assinado'` e doc tem `client_id`, abrir dialog em vez de salvar direto
- Novo estado `signingDoc` para o documento sendo assinado
- Novo estado `revenueAmount`, `revenueDate`, `revenueServiceType`
- Novo componente/seção `SignContractDialog` inline com:
  - Info do documento e cliente
  - Campos: valor, data, tipo de serviço
  - Preview de comissão (busca parceiro do cliente)
  - Botões: "Registrar Receita e Assinar" / "Apenas Assinar" / "Cancelar"
- Função `handleSignAndCreateRevenue` que replica a lógica de `FinanceRevenues.handleSave` (insert revenue → insert commission)

## Dados necessários

Ao abrir o dialog, buscar:
- Cliente completo: `clients.select('id, name, partner_id')` com o `client_id` do doc
- Parceiro (se existir): `partners.select('id, name, commission_rate')` com o `partner_id` do cliente

O valor é extraído de `doc.variables_data` procurando keys como `valor_servico`, `valor_total`, `valor`.

