
-- Enums
CREATE TYPE public.service_type AS ENUM ('regularizacao', 'venda_plataforma', 'consultoria', 'outro');
CREATE TYPE public.expense_category AS ENUM ('salario', 'comissao_paga', 'fornecedor', 'escritorio', 'marketing', 'outro');
CREATE TYPE public.commission_status AS ENUM ('pending', 'paid');

-- Receitas
CREATE TABLE public.revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL DEFAULT 'outro',
  amount numeric NOT NULL,
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Comissões
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  revenue_id uuid NOT NULL REFERENCES public.revenues(id) ON DELETE CASCADE,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'pending',
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Despesas
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.expense_category NOT NULL DEFAULT 'outro',
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean NOT NULL DEFAULT false,
  related_commission_id uuid REFERENCES public.commissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenues" ON public.revenues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage commissions" ON public.commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
