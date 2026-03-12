
-- Enums
CREATE TYPE public.regularization_status AS ENUM (
  'nova', 'em_analise', 'proposta_enviada', 'em_execucao', 'concluida', 'arquivada'
);
CREATE TYPE public.checklist_item_status AS ENUM ('pendente', 'recebido', 'nao_se_aplica');

-- Tipos de regularização
CREATE TABLE public.regularization_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  checklist_template jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regularization_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regularization_types" ON public.regularization_types FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Processos de regularização
CREATE TABLE public.regularization_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  property_submission_id uuid REFERENCES public.property_submissions(id) ON DELETE SET NULL,
  title text NOT NULL,
  type_id uuid REFERENCES public.regularization_types(id) ON DELETE SET NULL,
  status public.regularization_status NOT NULL DEFAULT 'nova',
  address text,
  property_type text,
  estimated_value numeric,
  estimated_completion date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regularization_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regularization_processes" ON public.regularization_processes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Checklist items
CREATE TABLE public.regularization_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  description text NOT NULL,
  status public.checklist_item_status NOT NULL DEFAULT 'pendente',
  received_at date,
  notes text
);
ALTER TABLE public.regularization_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regularization_checklist_items" ON public.regularization_checklist_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Documentos do processo
CREATE TABLE public.regularization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regularization_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regularization_documents" ON public.regularization_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Histórico / interações do processo
CREATE TABLE public.regularization_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.regularization_processes(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  note text NOT NULL,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  is_automatic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regularization_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regularization_interactions" ON public.regularization_interactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('regularization-documents', 'regularization-documents', false);

-- Storage RLS
CREATE POLICY "Admins can manage regularization docs" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'regularization-documents' AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (bucket_id = 'regularization-documents' AND has_role(auth.uid(), 'admin'::app_role));
