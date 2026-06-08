-- Sincroniza perfis faltantes: qualquer usuário em auth.users que ainda
-- não tem profile (ex.: criado pelo painel de Auth antes do trigger) passa
-- a aparecer em /admin/usuarios. Idempotente.
INSERT INTO public.profiles (id, email, name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
