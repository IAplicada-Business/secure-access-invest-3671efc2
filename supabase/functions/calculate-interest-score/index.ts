const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { access_link_id, property_id } = await req.json();

    if (!access_link_id || !property_id) {
      return new Response(
        JSON.stringify({ error: 'access_link_id and property_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: pageViews } = await supabase
      .from('page_views')
      .select('time_spent_seconds, scroll_depth_percent')
      .eq('access_link_id', access_link_id)
      .eq('property_id', property_id);

    const { data: ctaClicks } = await supabase
      .from('cta_clicks')
      .select('id')
      .eq('access_link_id', access_link_id)
      .eq('property_id', property_id);

    let score = 0;
    const times = pageViews?.map(v => v.time_spent_seconds || 0) || [0];
    const maxTime = Math.max(...times);
    if (maxTime > 120) score += 5;
    else if (maxTime > 60) score += 3;

    const depths = pageViews?.map(v => v.scroll_depth_percent || 0) || [0];
    if (Math.max(...depths) > 75) score += 2;

    if (ctaClicks && ctaClicks.length > 0) score += 10;

    if (score >= 10) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'hot_lead')
        .contains('metadata', { access_link_id, property_id })
        .maybeSingle();

      if (!existing) {
        const [linkRes, propRes] = await Promise.all([
          supabase.from('access_links').select('investor_name').eq('id', access_link_id).single(),
          supabase.from('properties').select('title').eq('id', property_id).single()
        ]);

        await supabase.from('notifications').insert({
          type: 'hot_lead',
          title: 'Lead Quente Detectado 🔥',
          message: `${linkRes.data?.investor_name || 'Investidor'} demonstrou alto interesse no imóvel "${propRes.data?.title || 'Imóvel'}"`,
          metadata: { access_link_id, property_id, score },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
