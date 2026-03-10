
-- Create submission_links table
CREATE TABLE public.submission_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  label text NOT NULL DEFAULT 'Geral',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active submission links"
  ON public.submission_links FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage submission links"
  ON public.submission_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create property_submissions table
CREATE TABLE public.property_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  submission_link_id uuid REFERENCES public.submission_links(id),
  broker_name text NOT NULL,
  broker_phone text NOT NULL,
  broker_company text,
  owner_name text,
  irregularity_notes text,
  matricula_status text NOT NULL DEFAULT 'nao',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert property submissions"
  ON public.property_submissions FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can manage property submissions"
  ON public.property_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous insert on properties with pending_review status
CREATE POLICY "Anyone can insert pending_review properties"
  ON public.properties FOR INSERT TO public
  WITH CHECK (status = 'pending_review'::property_status);

-- Allow anonymous to view pending_review properties they just created (for the submission flow)
CREATE POLICY "Anyone can view pending_review properties"
  ON public.properties FOR SELECT TO public
  USING (status = 'pending_review'::property_status);
