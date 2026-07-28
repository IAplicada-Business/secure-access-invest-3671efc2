-- Financeiro: status de recebimento e coluna de apoio para Kanban de receitas.
-- Idempotente para permitir reaplicacao em ambientes que ja tenham parte do schema.

DO $$
DECLARE
  status_column_existed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'revenues'
      AND column_name = 'status'
  )
  INTO status_column_existed;

  ALTER TABLE public.revenues
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aguardando';

  IF NOT status_column_existed THEN
    UPDATE public.revenues
    SET status = CASE
      WHEN COALESCE(due_date, received_at) > CURRENT_DATE THEN 'aguardando'
      ELSE 'pago'
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'revenues_status_check'
      AND conrelid = 'public.revenues'::regclass
  ) THEN
    ALTER TABLE public.revenues
      ADD CONSTRAINT revenues_status_check
      CHECK (status IN ('aguardando', 'pago'));
  END IF;
END $$;

ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS vencimento date;

UPDATE public.revenues
SET vencimento = COALESCE(due_date, received_at)
WHERE vencimento IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'revenues'
      AND column_name = 'status_kanban'
  ) THEN
    BEGIN
      ALTER TABLE public.revenues
        ADD COLUMN status_kanban text
        GENERATED ALWAYS AS (
          CASE
            WHEN status = 'pago' THEN 'pago'
            WHEN status = 'aguardando' AND vencimento < CURRENT_DATE THEN 'em_atraso'
            WHEN status = 'aguardando' THEN 'aguardando'
            ELSE status
          END
        ) STORED;
    EXCEPTION
      WHEN invalid_object_definition OR feature_not_supported THEN
        -- Postgres requires generated expressions to be immutable; CURRENT_DATE is not.
        -- Keep the indexed support column and maintain it on row changes instead.
        ALTER TABLE public.revenues
          ADD COLUMN status_kanban text;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_revenue_status_kanban()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status_kanban := CASE
    WHEN NEW.status = 'pago' THEN 'pago'
    WHEN NEW.status = 'aguardando' AND NEW.vencimento < CURRENT_DATE THEN 'em_atraso'
    WHEN NEW.status = 'aguardando' THEN 'aguardando'
    ELSE NEW.status
  END;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  kanban_is_generated text;
BEGIN
  SELECT is_generated
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'revenues'
    AND column_name = 'status_kanban'
  INTO kanban_is_generated;

  IF kanban_is_generated = 'NEVER' THEN
    UPDATE public.revenues
    SET status_kanban = CASE
      WHEN status = 'pago' THEN 'pago'
      WHEN status = 'aguardando' AND vencimento < CURRENT_DATE THEN 'em_atraso'
      WHEN status = 'aguardando' THEN 'aguardando'
      ELSE status
    END;

    DROP TRIGGER IF EXISTS trg_revenues_status_kanban ON public.revenues;
    CREATE TRIGGER trg_revenues_status_kanban
      BEFORE INSERT OR UPDATE OF status, vencimento
      ON public.revenues
      FOR EACH ROW
      EXECUTE FUNCTION public.set_revenue_status_kanban();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_revenues_status_kanban_vencimento
  ON public.revenues (status_kanban, vencimento);

COMMENT ON COLUMN public.revenues.status IS 'Status financeiro da receita: aguardando ou pago.';
COMMENT ON COLUMN public.revenues.vencimento IS 'Data de vencimento usada para classificar receitas aguardando como em atraso.';
COMMENT ON COLUMN public.revenues.status_kanban IS 'Coluna de apoio para Kanban: aguardando, em_atraso ou pago.';
