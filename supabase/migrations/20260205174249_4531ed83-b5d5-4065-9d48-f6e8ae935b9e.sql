-- Create property_status enum
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'sold', 'archived');

-- Create property_type enum
CREATE TYPE public.property_type AS ENUM ('casa', 'terreno', 'apartamento', 'comercial', 'outro');

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  neighborhood TEXT,
  acquisition_cost NUMERIC(15,2),
  regularization_cost NUMERIC(15,2),
  projected_value NUMERIC(15,2),
  regularization_time TEXT,
  risks TEXT,
  property_type property_type DEFAULT 'outro',
  status property_status DEFAULT 'draft',
  images TEXT[] DEFAULT '{}',
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create access_links table for investor secret links
CREATE TABLE public.access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  investor_name TEXT NOT NULL,
  investor_email TEXT,
  investor_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create page_views table for tracking
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_link_id UUID REFERENCES public.access_links(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  time_spent_seconds INTEGER DEFAULT 0,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Create settings table for configurable values
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS for properties: public read for published, auth required for write
CREATE POLICY "Anyone can view published properties"
  ON public.properties FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can view all properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (true);

-- RLS for access_links: only auth can manage
CREATE POLICY "Authenticated users can view access_links"
  ON public.access_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert access_links"
  ON public.access_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update access_links"
  ON public.access_links FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete access_links"
  ON public.access_links FOR DELETE
  TO authenticated
  USING (true);

-- Public can validate tokens (read by token)
CREATE POLICY "Anyone can validate access links by token"
  ON public.access_links FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS for page_views: public insert, auth read
CREATE POLICY "Anyone can insert page_views"
  ON public.page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update page_views"
  ON public.page_views FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can view page_views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (true);

-- RLS for settings: auth only
CREATE POLICY "Authenticated users can manage settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default WhatsApp setting
INSERT INTO public.settings (key, value) VALUES ('whatsapp_number', '5511999999999');

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Storage policies for property-images bucket
CREATE POLICY "Anyone can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can update property images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can delete property images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images');