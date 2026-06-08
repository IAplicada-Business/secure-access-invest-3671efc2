import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente no contexto do chamador para validar que é admin.
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub;
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Apenas administradores podem criar usuários." }, 403);

    const { email, password, name, is_admin, screens } = await req.json();
    if (!email || !password) {
      return json({ error: "email e password são obrigatórios" }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "A senha deve ter ao menos 6 caracteres" }, 400);
    }

    const admin = createClient(url, serviceKey);

    // Cria o usuário já confirmado (senha provisória).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || "Erro ao criar usuário" }, 400);
    }
    const newId = created.user.id;

    // Garante o profile (o trigger também cobre, mas reforçamos).
    await admin.from("profiles").upsert({ id: newId, email, name: name || email });

    if (is_admin) {
      await admin.from("user_roles").insert({ user_id: newId, role: "admin" });
    }

    if (Array.isArray(screens) && screens.length > 0) {
      await admin.from("user_screen_permissions").insert(
        screens.map((s: string) => ({ user_id: newId, screen: s })),
      );
    }

    return json({ user_id: newId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
