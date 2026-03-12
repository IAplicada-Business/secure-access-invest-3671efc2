
-- Enums
CREATE TYPE public.document_template_type AS ENUM ('proposta', 'contrato', 'relatorio');
CREATE TYPE public.document_template_status AS ENUM ('ativo', 'rascunho');
CREATE TYPE public.generated_document_status AS ENUM ('rascunho', 'enviado', 'assinado', 'arquivado');

-- Document templates
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type document_template_type NOT NULL,
  content text NOT NULL DEFAULT '',
  variables jsonb DEFAULT '[]',
  status document_template_status NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document_templates"
  ON public.document_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Generated documents
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  type document_template_type NOT NULL,
  title text NOT NULL,
  variables_data jsonb DEFAULT '{}',
  file_url text,
  status generated_document_status NOT NULL DEFAULT 'rascunho',
  process_id uuid REFERENCES public.regularization_processes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage generated_documents"
  ON public.generated_documents FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false);

CREATE POLICY "Admins can manage generated-documents storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'generated-documents' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'generated-documents' AND has_role(auth.uid(), 'admin'::app_role));
