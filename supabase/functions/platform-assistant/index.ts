import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
}

function countBy<T extends Record<string, any>>(rows: T[], key: string) {
  const map: Record<string, number> = {};
  for (const r of rows || []) {
    const k = String(r?.[key] ?? "—");
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

async function buildSnapshot(admin: ReturnType<typeof createClient>) {
  const { start, end } = monthRange();
  const thirty = new Date(Date.now() - 30 * 864e5).toISOString();

  const [
    properties,
    clients,
    accessLinks,
    pageViews,
    revenues,
    expenses,
    commissions,
    regs,
    submissions,
  ] = await Promise.all([
    admin.from("properties").select("id,status,retrofit_status,title,price"),
    admin.from("clients").select("id,type,crm_stage,status"),
    admin.from("access_links").select("id,active,expires_at").eq("active", true),
    admin.from("page_views").select("id,created_at").gte("created_at", thirty),
    admin.from("revenues").select("amount,received_at,status").gte("received_at", start).lt("received_at", end),
    admin.from("expenses").select("amount,paid_at,status").gte("paid_at", start).lt("paid_at", end),
    admin.from("commissions").select("id,amount,status"),
    admin.from("regularization_processes").select("id,status"),
    admin.from("property_submissions").select("id,created_at,status"),
  ]);

  const props = properties.data || [];
  const cls = clients.data || [];
  const revs = revenues.data || [];
  const exps = expenses.data || [];
  const coms = commissions.data || [];

  const sumRev = revs.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
  const sumExp = exps.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
  const pendComs = coms.filter((c: any) => c.status === "pendente");
  const paidComs = coms.filter((c: any) => c.status === "paga" || c.status === "pago");

  return {
    imoveis: {
      total: props.length,
      por_status: countBy(props, "status"),
      por_retrofit_status: countBy(props, "retrofit_status"),
    },
    contatos: {
      total: cls.length,
      por_tipo: countBy(cls, "type"),
      funil_por_crm_stage: countBy(cls, "crm_stage"),
      por_status: countBy(cls, "status"),
    },
    links_ativos: (accessLinks.data || []).length,
    page_views_30d: (pageViews.data || []).length,
    financeiro_mes_atual: {
      receitas_total: BRL(sumRev),
      receitas_qtd: revs.length,
      despesas_total: BRL(sumExp),
      despesas_qtd: exps.length,
      saldo: BRL(sumRev - sumExp),
    },
    comissoes: {
      pendentes_qtd: pendComs.length,
      pendentes_total: BRL(pendComs.reduce((a: number, c: any) => a + Number(c.amount || 0), 0)),
      pagas_qtd: paidComs.length,
      pagas_total: BRL(paidComs.reduce((a: number, c: any) => a + Number(c.amount || 0), 0)),
    },
    regularizacoes: {
      total: (regs.data || []).length,
      por_status: countBy(regs.data || [], "status"),
    },
    submissoes: {
      total: (submissions.data || []).length,
      por_status: countBy(submissions.data || [], "status"),
    },
    gerado_em: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const authClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, history } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const snapshot = await buildSnapshot(admin);

    const systemPrompt = `Você é a Capí, mascote-assistente da Tijolo em Capital (regularização de imóveis).
Responda SEMPRE em português do Brasil, de forma direta, calorosa e objetiva (máx. ~6 linhas por resposta salvo se pedirem detalhe).

REGRAS RÍGIDAS:
• Use APENAS os números do SNAPSHOT abaixo. NUNCA invente ou estime valores.
• Se a informação não estiver no snapshot, diga que não tem esse dado agora e sugira onde ver no painel.
• Valores monetários já vêm formatados como R$ — mantenha assim.
• Ao citar áreas do painel, sugira os menus: Dashboard, Imóveis, Submissões, Links, Financeiro, Regularizações, Comunicações, Documentos, CRM (Funil), Contatos, Parceiros.
• Sem markdown pesado; pode usar • para bullets curtos.

SNAPSHOT (dados ao vivo do banco):
${JSON.stringify(snapshot, null, 2)}`;

    const msgs = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-10) : []).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || ""),
      })),
      { role: "user", content: message },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: msgs,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "Sem resposta.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("platform-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
