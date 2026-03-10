
-- Create client types
CREATE TYPE public.client_type AS ENUM ('investor', 'incorporator', 'individual');
CREATE TYPE public.client_status AS ENUM ('prospect', 'active', 'completed');

-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type client_type NOT NULL DEFAULT 'investor',
  cpf_cnpj text,
  phone text NOT NULL,
  email text,
  origin text,
  partner_name text,
  status client_status NOT NULL DEFAULT 'prospect',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create client_documents table
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create client_interactions table
CREATE TABLE public.client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  note text NOT NULL,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client interactions"
  ON public.client_interactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add client_id to access_links
ALTER TABLE public.access_links ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create private bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Storage RLS for client-documents bucket
CREATE POLICY "Admins can upload client documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view client documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));
