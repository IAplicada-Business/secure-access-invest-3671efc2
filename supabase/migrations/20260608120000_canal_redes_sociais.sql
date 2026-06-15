-- Canal de entrada: 'instagram' vira 'redes_sociais' (Insta/YouTube/LinkedIn).
-- Mantém 'indicacao' e os demais. Idempotente.
UPDATE public.clients SET canal_entrada = 'redes_sociais' WHERE canal_entrada = 'instagram';

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_canal_entrada_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_canal_entrada_check
  CHECK (canal_entrada IS NULL OR canal_entrada IN
    ('redes_sociais','indicacao','corretor','evento','organico','outro'));
