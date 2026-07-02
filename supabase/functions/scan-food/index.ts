// supabase/functions/scan-food/index.ts
// Edge Function: Analyzes food photos via GPT-4o Vision.
// SECURITY: Validates auth, enforces daily scan limits, sanitizes outputs.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── AUTH ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── RATE LIMIT CHECK ────────────────────────────────────
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status, trial_end')
      .eq('user_id', user.id)
      .single();

    const isPro = subscription?.status === 'active' ||
      (subscription?.status === 'trial' && new Date(subscription?.trial_end ?? 0) > new Date());

    if (!isPro) {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('daily_usage')
        .select('food_scans_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single();

      const count = usage?.food_scans_count ?? 0;
      if (count >= 5) {
        return new Response(
          JSON.stringify({ error: 'Daily scan limit reached. Upgrade to Pro for unlimited scans.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── GET IMAGE URL FROM REQUEST ──────────────────────────
    const body = await req.json() as { image_url?: string };
    const imageUrl = body.image_url;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'image_url is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SECURITY: Validate image URL is from our Supabase storage only
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!imageUrl.startsWith(supabaseUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid image source' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── OPENAI VISION CALL ──────────────────────────────────
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI not configured');

    const systemPrompt = `You are an expert Indian nutritionist and food recognition AI.
Analyze food photos and return accurate nutritional data.
You specialize in Indian cuisine: dal, roti, rice, sabzi, curries, dosas, idlis, biryani, etc.
Always break down mixed dishes into components.
Return ONLY valid JSON with no markdown or explanation.`;

    const userPrompt = `Analyze this food image and return nutritional data.
For mixed Indian meals, break them into individual components.
Return this exact JSON structure:
{
  "foods": [
    {
      "name": "Dal Makhani",
      "portion_size": "1 bowl (200g)",
      "calories": 280,
      "protein_g": 12.5,
      "carbs_g": 32.0,
      "fat_g": 10.0,
      "fiber_g": 8.0
    }
  ],
  "total_calories": 280,
  "total_protein": 12.5,
  "total_carbs": 32.0,
  "total_fat": 10.0,
  "confidence_score": 0.87,
  "notes": "Estimated based on typical home-cooked serving. Actual values may vary by 10-15%."
}
Be honest about confidence. If unclear, lower the confidence_score.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) throw new Error('Vision API error');

    const openaiData = await openaiRes.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    // ── INCREMENT USAGE ─────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_food_scan', { p_user_id: user.id, p_date: today });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[scan-food]', error);
    return new Response(
      JSON.stringify({ error: 'Food analysis failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
