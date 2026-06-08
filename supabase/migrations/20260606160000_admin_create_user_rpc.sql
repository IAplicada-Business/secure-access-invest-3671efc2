-- Criação de usuário via SQL (sem edge function).
-- Função SECURITY DEFINER: só admin pode chamar; cria o usuário no
-- auth.users (senha criptografada), a identidade de e-mail, o profile,
-- papel admin opcional e telas liberadas. Chamada pelo app via RPC.

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email    text,
  p_password text,
  p_name     text    DEFAULT NULL,
  p_is_admin boolean DEFAULT false,
  p_screens  text[]  DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;
  IF coalesce(length(p_password), 0) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter ao menos 6 caracteres';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', coalesce(p_name, p_email)),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', p_email),
    'email', v_id::text,
    now(), now(), now()
  );

  -- profile (o trigger também cria; reforço por garantia)
  INSERT INTO public.profiles (id, email, name)
  VALUES (v_id, p_email, coalesce(p_name, p_email))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

  IF p_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  IF array_length(p_screens, 1) IS NOT NULL THEN
    INSERT INTO public.user_screen_permissions (user_id, screen)
    SELECT v_id, unnest(p_screens)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, boolean, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, boolean, text[]) TO authenticated;
