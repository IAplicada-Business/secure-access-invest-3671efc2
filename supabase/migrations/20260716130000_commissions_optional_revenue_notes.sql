-- Permite comissão manual sem receita vinculada + observação de origem.
ALTER TABLE public.commissions
  ALTER COLUMN revenue_id DROP NOT NULL;

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.commissions.notes IS 'Origem / contexto (ex: indicação, fechamento CRM, lançamento manual)';
