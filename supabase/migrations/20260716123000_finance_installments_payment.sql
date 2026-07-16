-- Campos para previsibilidade financeira: parcelas, entrada, tipo de pagamento, categoria e recorrência.

-- ========== RECEITAS ==========
ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS entrada numeric,
  ADD COLUMN IF NOT EXISTS installment_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_revenue_id uuid REFERENCES public.revenues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date;

COMMENT ON COLUMN public.revenues.payment_type IS 'pix | ted | boleto | cartao | dinheiro | outro';
COMMENT ON COLUMN public.revenues.category IS 'Categoria analítica (ex: operacional, projeto)';
COMMENT ON COLUMN public.revenues.entrada IS 'Valor de entrada do negócio (quando houver)';
COMMENT ON COLUMN public.revenues.installment_count IS 'Total de parcelas (1 = à vista)';
COMMENT ON COLUMN public.revenues.installment_number IS 'Número desta parcela no grupo';
COMMENT ON COLUMN public.revenues.parent_revenue_id IS 'Primeira receita do grupo de parcelas';
COMMENT ON COLUMN public.revenues.due_date IS 'Data de vencimento prevista da parcela';

-- ========== DESPESAS ==========
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS installment_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_months integer,
  ADD COLUMN IF NOT EXISTS due_date date;

COMMENT ON COLUMN public.expenses.payment_type IS 'pix | ted | boleto | cartao | dinheiro | outro';
COMMENT ON COLUMN public.expenses.installment_count IS 'Total de parcelas (1 = à vista)';
COMMENT ON COLUMN public.expenses.installment_number IS 'Número desta parcela no grupo';
COMMENT ON COLUMN public.expenses.parent_expense_id IS 'Primeira despesa do grupo de parcelas/recorrência';
COMMENT ON COLUMN public.expenses.recurrence_months IS 'Duração em meses quando is_recurring = true';
COMMENT ON COLUMN public.expenses.due_date IS 'Data de vencimento prevista';
