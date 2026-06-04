import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, tone, topic, points } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneMap: Record<string, string> = {
      informativo: "informativo e profissional, transmitindo credibilidade e conhecimento do mercado",
      comercial: "comercial e persuasivo, mas sem ser agressivo — destacando oportunidades e benefícios",
      relacionamento: "acolhedor e próximo, fortalecendo o vínculo pessoal e a parceria de longo prazo",
    };

    const typeMap: Record<string, string> = {
      newsletter: "newsletter mensal com novidades e atualizações",
      aviso: "aviso importante sobre o mercado ou operações",
      oferta: "comunicação sobre uma oportunidade ou oferta específica",
      personalizada: "mensagem personalizada",
    };

    const systemPrompt = `Você é a assistente de comunicação da Tijolo em Capital, uma empresa especializada em regularização de imóveis no mercado imobiliário brasileiro. A Tijolo em Capital trabalha com parceiros (imobiliárias, corretores autônomos, assessores de investimento) e clientes (investidores, incorporadores, pessoas físicas).

A dona da empresa é a Julie, que valoriza relacionamento humano e comunicação direta via WhatsApp.

REGRAS OBRIGATÓRIAS:
• O texto DEVE ser formatado para WhatsApp — sem markdown (sem **, ##, etc.)
• Use • para bullets em vez de - ou *
• Use quebras de linha naturais para separar parágrafos
• Mantenha o texto conciso — ideal entre 3 a 6 parágrafos curtos
• Use emojis com moderação (máximo 3-4 no texto inteiro)
• O tom deve ser ${toneMap[tone] || toneMap.informativo}
• Este é um(a) ${typeMap[type] || typeMap.personalizada}
• NÃO inclua saudação genérica como "Prezado(a)" — comece direto com o conteúdo ou uma saudação informal como "Olá!" ou "Oi!"
• Termine com uma chamada para ação suave ou convite ao diálogo
• Assine como "Julie — Tijolo em Capital"`;

    const userPrompt = `Gere uma comunicação para WhatsApp sobre o seguinte tema:

TEMA: ${topic}

${points ? `PONTOS QUE DEVEM APARECER:\n${points}` : ""}

Gere apenas o texto da mensagem, sem explicações adicionais.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar comunicação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-communication error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
