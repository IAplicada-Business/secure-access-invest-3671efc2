import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

async function buildPlatformContext(admin: ReturnType<typeof createClient>) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: properties },
    { data: clients },
    { count: activeLinks },
    { data: revenues },
    { data: expenses },
    { data: commissions },
    { data: regs },
    { count: monthViews },
    { data: submissions },
  ] = await Promise.all([
    admin.from("properties").select("id, status, title"),
    admin.from("clients").select("id, status, crm_stage, type, name, created_at"),
    admin.from("access_links").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("revenues").select("amount, service_type").gte("received_at", monthStart).lte("received_at", monthEnd),
    admin.from("expenses").select("amount").gte("expense_date", monthStart).lte("expense_date", monthEnd),
    admin.from("commissions").select("amount, status, paid_at"),
    admin.from("regularization_processes").select("id, status, title"),
    admin
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", thirtyDaysAgo),
    admin.from("property_submissions").select("id, status").limit(200),
  ]);

  const byStatus = (rows: Array<{ status: string | null }> | null) => {
    const map: Record<string, number> = {};
    (rows || []).forEach((r) => {
      const s = r.status || "desconhecido";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  };

  const stageCount: Record<string, number> = {};
  (clients || []).forEach((c) => {
    const s = c.crm_stage || "contato";
    stageCount[s] = (stageCount[s] || 0) + 1;
  });

  const leads = (clients || []).filter((c) => c.status === "prospect").length;
  const converted = (clients || []).filter((c) => c.status === "active" || c.status === "completed").length;
  const monthRevenue = (revenues || []).reduce((a, r) => a + Number(r.amount || 0), 0);
  const monthExpenses = (expenses || []).reduce((a, r) => a + Number(r.amount || 0), 0);
  const pendingComm = (commissions || [])
    .filter((c) => c.status === "pending")
    .reduce((a, c) => a + Number(c.amount || 0), 0);
  const paidComm = (commissions || [])
    .filter((c) => c.status === "paid")
    .reduce((a, c) => a + Number(c.amount || 0), 0);
  let retrofitSafe = 0;
  {
    const { data: retrofitRows, error: retrofitErr } = await admin
      .from("properties")
      .select("id")
      .eq("has_retrofit", true);
    if (!retrofitErr) retrofitSafe = retrofitRows?.length || 0;
  }
  const pendingReview = (properties || []).filter((p) => p.status === "pending_review").length;
  const published = (properties || []).filter((p) => p.status === "published").length;
  const activeRegs = (regs || []).filter((r) => !["concluida", "arquivada"].includes(r.status || "")).length;

  const recentContacts = (clients || [])
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 8)
    .map((c) => ({
      name: c.name,
      status: c.status,
      stage: c.crm_stage,
      type: c.type,
    }));

  return {
    gerado_em: now.toISOString(),
    imoveis: {
      total: properties?.length || 0,
      por_status: byStatus(properties),
      publicados: published,
      aguardando_avaliacao: pendingReview,
      com_retrofit: retrofitSafe,
    },
    contatos: {
      total: clients?.length || 0,
      leads,
      clientes: converted,
      funil_por_etapa: stageCount,
      recentes: recentContacts,
    },
    links_ativos: activeLinks || 0,
    acessos_catalogo_30d: monthViews || 0,
    financeiro_mes: {
      receita: monthRevenue,
      despesas: monthExpenses,
      resultado: monthRevenue - monthExpenses,
      comissoes_pendentes: pendingComm,
      comissoes_pagas_total: paidComm,
      receitas_por_tipo: (revenues || []).reduce((acc: Record<string, number>, r) => {
        const k = r.service_type || "outro";
        acc[k] = (acc[k] || 0) + Number(r.amount || 0);
        return acc;
      }, {}),
    },
    regularizacoes: {
      total: regs?.length || 0,
      ativas: activeRegs,
      por_status: byStatus(regs),
    },
    submissoes: {
      total: submissions?.length || 0,
      por_status: byStatus(submissions as Array<{ status: string | null }> | null),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, history } = await req.json() as {
      message?: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const context = await buildPlatformContext(admin);

    const systemPrompt = `Você é a Capí, assistente da plataforma Tijolo em Capital (mascote capivara).
Ajuda a equipe interna a consultar o painel: CRM/contatos, imóveis, financeiro, regularizações, links e engajamento.

REGRAS:
• Responda em português do Brasil, de forma clara e objetiva.
• Use APENAS os dados do CONTEXTO DO SISTEMA abaixo. Se a informação não estiver no contexto, diga que não encontrou no banco neste momento.
• Formate valores em R$ quando for dinheiro (ex.: R$ 12.500,00).
• Pode sugerir onde olhar no menu (Dashboard, CRM, Contatos, Financeiro, Imóveis, Regularizações).
• Não invente leads, valores ou imóveis.
• Não revele chaves, SQL ou detalhes técnicos internos.
• Se perguntarem quem você é: assistente Capí da Tijolo em Capital, com dados ao vivo do sistema.

CONTEXTO DO SISTEMA (JSON):
${JSON.stringify(context, null, 2)}`;

    const prior = (history || [])
      .slice(-8)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...prior,
          { role: "user", content: message.trim().slice(0, 4000) },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar a assistente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Não consegui gerar uma resposta agora.";

    return new Response(
      JSON.stringify({ content, context_at: context.gerado_em }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("platform-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
