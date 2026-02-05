import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  access_link_id: string;
  property_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { access_link_id, property_id } = body;

    if (!access_link_id || !property_id) {
      return new Response(
        JSON.stringify({ error: 'access_link_id and property_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get page views for this investor and property
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('time_spent_seconds, scroll_depth_percent')
      .eq('access_link_id', access_link_id)
      .eq('property_id', property_id);

    // Get CTA clicks for this investor and property
    const { data: ctaClicks } = await supabase
      .from('cta_clicks')
      .select('id')
      .eq('access_link_id', access_link_id)
      .eq('property_id', property_id);

    // Calculate score
    let score = 0;

    // Check time spent
    const maxTimeSpent = Math.max(...(pageViews?.map(v => v.time_spent_seconds || 0) || [0]));
    if (maxTimeSpent > 120) {
      score += 5;
    } else if (maxTimeSpent > 60) {
      score += 3;
    }

    // Check scroll depth
    const maxScrollDepth = Math.max(...(pageViews?.map(v => v.scroll_depth_percent || 0) || [0]));
    if (maxScrollDepth > 75) {
      score += 2;
    }

    // Check CTA clicks
    if (ctaClicks && ctaClicks.length > 0) {
      score += 10;
    }

    console.log(`Score calculated for ${access_link_id} on ${property_id}: ${score}`);

    // If score >= 10, create a hot_lead notification (if not already exists)
    if (score >= 10) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'hot_lead')
        .contains('metadata', { access_link_id, property_id })
        .maybeSingle();

      if (!existingNotification) {
        // Get investor name
        const { data: accessLink } = await supabase
          .from('access_links')
          .select('investor_name')
          .eq('id', access_link_id)
          .single();

        // Get property title
        const { data: property } = await supabase
          .from('properties')
          .select('title')
          .eq('id', property_id)
          .single();

        const investorName = accessLink?.investor_name || 'Investidor';
        const propertyTitle = property?.title || 'Imóvel';

        // Create notification
        await supabase.from('notifications').insert({
          type: 'hot_lead',
          title: 'Lead Quente Detectado 🔥',
          message: `${investorName} demonstrou alto interesse no imóvel "${propertyTitle}"`,
          metadata: {
            access_link_id,
            property_id,
            score,
          },
        });

        console.log(`Hot lead notification created for ${investorName}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});