-- Define o WhatsApp Business da Juliê como número oficial (Prompt 08).
-- +55 11 94422-0295 -> 5511944220295
INSERT INTO public.settings (key, value)
VALUES ('whatsapp_number', '5511944220295')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();
