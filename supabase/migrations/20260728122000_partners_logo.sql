ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS logo_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('partners-logos', 'partners-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view partner logos" ON storage.objects;
CREATE POLICY "Anyone can view partner logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partners-logos');

DROP POLICY IF EXISTS "Admins can upload partner logos" ON storage.objects;
CREATE POLICY "Admins can upload partner logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partners-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can update partner logos" ON storage.objects;
CREATE POLICY "Admins can update partner logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partners-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'partners-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can delete partner logos" ON storage.objects;
CREATE POLICY "Admins can delete partner logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partners-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
