-- Adiciona updated_at em regularization_processes com auto-update no UPDATE.
-- Reaproveita a função public.update_updated_at_column() já existente.
-- Idempotente.

ALTER TABLE public.regularization_processes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_regularization_processes_updated_at ON public.regularization_processes;
CREATE TRIGGER update_regularization_processes_updated_at
  BEFORE UPDATE ON public.regularization_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
