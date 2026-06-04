-- Campos de organização do cliente (Prompt 6B) — DENTRO do contrato.
-- Canal de entrada, link do Drive, observações, tags e cidade.
-- Idempotente.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS canal_entrada text,
  ADD COLUMN IF NOT EXISTS canal_entrada_detalhe text,
  ADD COLUMN IF NOT EXISTS drive_link text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cidade text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_canal_entrada_check') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_canal_entrada_check
      CHECK (canal_entrada IS NULL OR canal_entrada IN
        ('instagram','indicacao','corretor','evento','organico','outro'));
  END IF;
END $$;
