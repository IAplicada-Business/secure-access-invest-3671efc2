
-- Enums for communications
CREATE TYPE public.communication_type AS ENUM ('newsletter', 'aviso', 'oferta', 'personalizada');
CREATE TYPE public.communication_tone AS ENUM ('informativo', 'comercial', 'relacionamento');
CREATE TYPE public.communication_audience AS ENUM ('all_partners', 'partner_type', 'all_clients', 'manual');
CREATE TYPE public.communication_status AS ENUM ('rascunho', 'pronta', 'enviada');
CREATE TYPE public.communication_contact_type AS ENUM ('partner', 'client');

-- Communications table
CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type communication_type NOT NULL,
  tone communication_tone NOT NULL DEFAULT 'informativo',
  briefing_topic text,
  briefing_points text,
  generated_content text,
  final_content text,
  audience_type communication_audience NOT NULL DEFAULT 'all_partners',
  audience_filter text,
  status communication_status NOT NULL DEFAULT 'rascunho',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage communications"
  ON public.communications
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Communication recipients table
CREATE TABLE public.communication_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  contact_type communication_contact_type NOT NULL,
  contact_id uuid NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  sent_at timestamp with time zone
);

ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage communication_recipients"
  ON public.communication_recipients
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
