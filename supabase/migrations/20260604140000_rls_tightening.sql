-- Endurecimento das policies de tracking e settings.
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.

-- =========================================================
-- notifications: remover INSERT anônimo.
-- Apenas edge functions com service_role (que ignoram RLS) inserem.
-- SELECT/gestão permanece restrito a admin.
-- =========================================================
DROP POLICY IF EXISTS "Allow anonymous insert on notifications" ON public.notifications;

-- Garante a policy de acesso admin (recria de forma idempotente).
DROP POLICY IF EXISTS "Allow admin full access on notifications" ON public.notifications;
CREATE POLICY "Allow admin full access on notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- cta_clicks: remover UPDATE anônimo (se existir).
-- INSERT anônimo permanece (tracking). SELECT apenas admin.
-- =========================================================
DROP POLICY IF EXISTS "Allow anonymous update on cta_clicks" ON public.cta_clicks;
DROP POLICY IF EXISTS "Anyone can update cta_clicks" ON public.cta_clicks;

-- INSERT anônimo (recria idempotente).
DROP POLICY IF EXISTS "Allow anonymous inserts on cta_clicks" ON public.cta_clicks;
CREATE POLICY "Allow anonymous inserts on cta_clicks" ON public.cta_clicks
  FOR INSERT TO public
  WITH CHECK (true);

-- SELECT apenas admin (recria idempotente).
DROP POLICY IF EXISTS "Allow admin select on cta_clicks" ON public.cta_clicks;
CREATE POLICY "Allow admin select on cta_clicks" ON public.cta_clicks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- page_views: remover UPDATE anônimo.
-- INSERT anônimo permanece. SELECT apenas admin.
-- =========================================================
DROP POLICY IF EXISTS "Anyone can update page_views" ON public.page_views;

-- INSERT anônimo (recria idempotente).
DROP POLICY IF EXISTS "Anyone can insert page_views" ON public.page_views;
CREATE POLICY "Anyone can insert page_views" ON public.page_views
  FOR INSERT TO public
  WITH CHECK (true);

-- SELECT apenas admin (antes era qualquer autenticado).
DROP POLICY IF EXISTS "Authenticated users can view page_views" ON public.page_views;
DROP POLICY IF EXISTS "Admins can view page_views" ON public.page_views;
CREATE POLICY "Admins can view page_views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- settings: gestão (FOR ALL) passa a exigir admin.
-- SELECT público continua liberado para chaves de uso público
-- (ex.: whatsapp_number).
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SELECT público (recria idempotente).
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT TO public
  USING (true);
