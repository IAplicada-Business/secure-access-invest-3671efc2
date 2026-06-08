-- Gestão de usuários (excluir / trocar senha) via SQL — sem edge function.
-- Funções SECURITY DEFINER, só admin pode chamar.

-- Trocar senha de um usuário.
CREATE OR REPLACE FUNCTION public.admin_set_password(p_user_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem trocar senhas';
  END IF;
  IF coalesce(length(p_password), 0) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter ao menos 6 caracteres';
  END IF;
  UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

-- Excluir um usuário (cascade limpa profile, papéis, permissões, identidade).
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir o próprio usuário';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_password(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_password(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
