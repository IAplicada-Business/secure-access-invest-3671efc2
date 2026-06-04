-- Ajusta o CRM para as 3 etapas reais da Juliê (+ Perdido):
--   chegou · ligacao · fechou_contrato · perdido
-- Robusto e idempotente: funciona quer a migration anterior (7 etapas
-- 20260604170000) tenha sido aplicada no banco ou não.

-- 1) Converte colunas dependentes do enum para text (se existirem),
--    para permitir recriar o type sem erro de dependência.
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

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='clients' AND column_name='crm_stage_changed_at') THEN
    ALTER TABLE public.clients ADD COLUMN crm_stage_changed_at timestamptz;
  END IF;
END $$;

-- 2) Recria o enum com os 4 valores reais.
DROP TYPE IF EXISTS public.crm_stage_enum;
CREATE TYPE public.crm_stage_enum AS ENUM ('chegou', 'ligacao', 'fechou_contrato', 'perdido');

-- 3) Remapeia valores antigos (7 etapas) -> 4 novos (em text).
CREATE OR REPLACE FUNCTION public.__map_crm_stage(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE v
    WHEN 'lead_recebido'    THEN 'chegou'
    WHEN 'primeiro_contato' THEN 'ligacao'
    WHEN 'reuniao_agendada' THEN 'ligacao'
    WHEN 'proposta_enviada' THEN 'ligacao'
    WHEN 'negociacao'       THEN 'ligacao'
    WHEN 'fechado'          THEN 'fechou_contrato'
    WHEN 'chegou'           THEN 'chegou'
    WHEN 'ligacao'          THEN 'ligacao'
    WHEN 'fechou_contrato'  THEN 'fechou_contrato'
    WHEN 'perdido'          THEN 'perdido'
    ELSE 'chegou'
  END
$$;

UPDATE public.clients
  SET crm_stage = public.__map_crm_stage(COALESCE(crm_stage, 'chegou'));

-- 4) Converte clients.crm_stage de volta ao enum, com default e NOT NULL.
ALTER TABLE public.clients
  ALTER COLUMN crm_stage TYPE public.crm_stage_enum USING crm_stage::public.crm_stage_enum;
ALTER TABLE public.clients ALTER COLUMN crm_stage SET DEFAULT 'chegou';
ALTER TABLE public.clients ALTER COLUMN crm_stage SET NOT NULL;

-- 5) Garante a tabela de histórico e remapeia/converte suas colunas.
CREATE TABLE IF NOT EXISTS public.crm_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

UPDATE public.crm_stage_history SET from_stage = public.__map_crm_stage(from_stage) WHERE from_stage IS NOT NULL;
UPDATE public.crm_stage_history SET to_stage   = public.__map_crm_stage(to_stage)   WHERE to_stage   IS NOT NULL;

ALTER TABLE public.crm_stage_history
  ALTER COLUMN from_stage TYPE public.crm_stage_enum USING from_stage::public.crm_stage_enum;
ALTER TABLE public.crm_stage_history
  ALTER COLUMN to_stage TYPE public.crm_stage_enum USING to_stage::public.crm_stage_enum;

ALTER TABLE public.crm_stage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage crm_stage_history" ON public.crm_stage_history;
CREATE POLICY "Admins can manage crm_stage_history" ON public.crm_stage_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) (Re)cria a trigger de log de transição.
CREATE OR REPLACE FUNCTION public.log_crm_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.crm_stage IS DISTINCT FROM OLD.crm_stage THEN
    INSERT INTO public.crm_stage_history (client_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.crm_stage, NEW.crm_stage, auth.uid());
    NEW.crm_stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_crm_stage_change ON public.clients;
CREATE TRIGGER trg_log_crm_stage_change
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_stage_change();

-- 7) Limpa o helper temporário.
DROP FUNCTION IF EXISTS public.__map_crm_stage(text);
