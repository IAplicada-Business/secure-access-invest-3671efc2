-- Atualiza o funil do CRM para as etapas reais e adiciona campos de lead.
-- Etapas: Contato · Agendar reunião · Envio de proposta · Follow Up ·
--         Fechamento · Aguardando pagamento  (+ Perdido, lateral)
-- Robusto e idempotente.

-- 1) Converte colunas dependentes do enum para text.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='crm_stage_history') THEN
    ALTER TABLE public.crm_stage_history ALTER COLUMN from_stage TYPE text USING from_stage::text;
    ALTER TABLE public.crm_stage_history ALTER COLUMN to_stage   TYPE text USING to_stage::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='clients' AND column_name='crm_stage') THEN
    ALTER TABLE public.clients ALTER COLUMN crm_stage DROP DEFAULT;
    ALTER TABLE public.clients ALTER COLUMN crm_stage TYPE text USING crm_stage::text;
  ELSE
    ALTER TABLE public.clients ADD COLUMN crm_stage text;
  END IF;
END $$;

-- 2) Recria o enum com as etapas novas (+ perdido).
DROP TYPE IF EXISTS public.crm_stage_enum;
CREATE TYPE public.crm_stage_enum AS ENUM (
  'contato', 'agendar_reuniao', 'envio_proposta',
  'follow_up', 'fechamento', 'aguardando_pagamento', 'perdido'
);

-- 3) Remapeia quaisquer valores antigos -> novos.
CREATE OR REPLACE FUNCTION public.__map_crm_stage(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE v
    WHEN 'chegou'           THEN 'contato'
    WHEN 'ligacao'          THEN 'agendar_reuniao'
    WHEN 'fechou_contrato'  THEN 'fechamento'
    WHEN 'lead_recebido'    THEN 'contato'
    WHEN 'primeiro_contato' THEN 'contato'
    WHEN 'reuniao_agendada' THEN 'agendar_reuniao'
    WHEN 'proposta_enviada' THEN 'envio_proposta'
    WHEN 'negociacao'       THEN 'follow_up'
    WHEN 'fechado'          THEN 'fechamento'
    WHEN 'contato'              THEN 'contato'
    WHEN 'agendar_reuniao'     THEN 'agendar_reuniao'
    WHEN 'envio_proposta'      THEN 'envio_proposta'
    WHEN 'follow_up'           THEN 'follow_up'
    WHEN 'fechamento'          THEN 'fechamento'
    WHEN 'aguardando_pagamento' THEN 'aguardando_pagamento'
    WHEN 'perdido'             THEN 'perdido'
    ELSE 'contato'
  END
$$;

UPDATE public.clients SET crm_stage = public.__map_crm_stage(COALESCE(crm_stage, 'contato'));

-- 4) clients.crm_stage de volta ao enum.
ALTER TABLE public.clients ALTER COLUMN crm_stage TYPE public.crm_stage_enum USING crm_stage::public.crm_stage_enum;
ALTER TABLE public.clients ALTER COLUMN crm_stage SET DEFAULT 'contato';
ALTER TABLE public.clients ALTER COLUMN crm_stage SET NOT NULL;

-- 5) Histórico.
UPDATE public.crm_stage_history SET from_stage = public.__map_crm_stage(from_stage) WHERE from_stage IS NOT NULL;
UPDATE public.crm_stage_history SET to_stage   = public.__map_crm_stage(to_stage)   WHERE to_stage   IS NOT NULL;
ALTER TABLE public.crm_stage_history ALTER COLUMN from_stage TYPE public.crm_stage_enum USING from_stage::public.crm_stage_enum;
ALTER TABLE public.crm_stage_history ALTER COLUMN to_stage   TYPE public.crm_stage_enum USING to_stage::public.crm_stage_enum;

DROP FUNCTION IF EXISTS public.__map_crm_stage(text);

-- 6) Novos campos do lead: aniversário, endereço, CNPJ.
--    (CPF continua em cpf_cnpj; canal_entrada + partner_id já cobrem
--     "como chegou até mim" / imobiliária que indicou.)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cnpj text;
