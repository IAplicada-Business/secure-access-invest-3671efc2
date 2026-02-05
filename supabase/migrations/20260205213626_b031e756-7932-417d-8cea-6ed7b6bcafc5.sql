-- Bloco 1: Novos campos na tabela properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS highlight_tag text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS investor_notes text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude decimal;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude decimal;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medio';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_matricula boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_planta boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_iptu boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_certidoes boolean DEFAULT false;

-- Bloco 3.1: Adicionar scroll_depth_percent na page_views
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth_percent integer DEFAULT 0;

-- Bloco 3.2: Criar tabela cta_clicks
CREATE TABLE IF NOT EXISTS cta_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_link_id uuid REFERENCES access_links(id),
  property_id uuid REFERENCES properties(id),
  clicked_at timestamptz DEFAULT now()
);

ALTER TABLE cta_clicks ENABLE ROW LEVEL SECURITY;

-- RLS: insert anônimo permitido
CREATE POLICY "Allow anonymous inserts on cta_clicks" ON cta_clicks
  FOR INSERT WITH CHECK (true);

-- RLS: select apenas para admin autenticado
CREATE POLICY "Allow admin select on cta_clicks" ON cta_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Bloco 3.3: Criar tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS: full access para admin
CREATE POLICY "Allow admin full access on notifications" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS: insert anônimo permitido (para edge function criar notificações)
CREATE POLICY "Allow anonymous insert on notifications" ON notifications
  FOR INSERT WITH CHECK (true);