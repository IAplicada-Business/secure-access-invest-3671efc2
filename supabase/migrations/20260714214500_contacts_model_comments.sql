-- Modelo de Contatos (produto):
-- A tabela física `clients` permanece por histórico de FKs (interações, docs, comissões, etc.).
-- No produto, essa base é a lista unificada de Contatos:
--   - status = prospect  → Lead (ainda no pipeline)
--   - status = active|completed → Cliente (avançou / convertou)
-- Lead → Cliente ocorre ao mover para Fechamento / Aguardando pagamento no CRM,
-- ou manualmente em Contatos / detalhe do contato.

COMMENT ON TABLE public.clients IS
  'Contatos unificados: leads (status=prospect) e clientes (status=active|completed). Tabela física clients mantida por FKs; produto expõe como Contatos.';

COMMENT ON COLUMN public.clients.status IS
  'Relação comercial: prospect=Lead, active=Cliente ativo, completed=Cliente concluído.';
