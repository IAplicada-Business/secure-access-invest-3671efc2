
-- Fix RESTRICTIVE policies on submission_links
DROP POLICY IF EXISTS "Admins can manage submission links" ON public.submission_links;
DROP POLICY IF EXISTS "Anyone can view active submission links" ON public.submission_links;

CREATE POLICY "Admins can manage submission links" ON public.submission_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active submission links" ON public.submission_links
  FOR SELECT TO public
  USING (is_active = true);

-- Fix RESTRICTIVE policies on property_submissions
DROP POLICY IF EXISTS "Admins can manage property submissions" ON public.property_submissions;
DROP POLICY IF EXISTS "Anyone can insert property submissions" ON public.property_submissions;

CREATE POLICY "Admins can manage property submissions" ON public.property_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert property submissions" ON public.property_submissions
  FOR INSERT TO public
  WITH CHECK (true);
