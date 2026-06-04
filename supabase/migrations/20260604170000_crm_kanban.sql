-- CRM Kanban: etapa do funil de vendas por cliente + histórico de transições.
-- ⚠️ Etapas DEFAULT (provisórias) — ajustar conforme o funil que a Juliê usar.
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_stage_enum') THEN
    CREATE TYPE public.crm_stage_enum AS ENUM (
      'lead_recebido',
      'primeiro_contato',
      'reuniao_agendada',
      'proposta_enviada',
      'negociacao',
      'fechado',
      'perdido'
    );
  END IF;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS crm_stage public.crm_stage_enum NOT NULL DEFAULT 'lead_recebido',
  ADD COLUMN IF NOT EXISTS crm_stage_changed_at timestamptz;

-- Histórico de mudanças de etapa
CREATE TABLE IF NOT EXISTS public.crm_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_stage public.crm_stage_enum,
  to_stage public.crm_stage_enum NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_stage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage crm_stage_history" ON public.crm_stage_history;
CREATE POLICY "Admins can manage crm_stage_history" ON public.crm_stage_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: grava transição e atualiza crm_stage_changed_at.
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
