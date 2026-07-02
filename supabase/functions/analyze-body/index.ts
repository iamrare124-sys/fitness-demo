// supabase/functions/analyze-body/index.ts
// Analyzes front + side body photos via GPT-4o Vision.
// SECURITY: Validates photos are from private Supabase storage only.

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json() as {
      front_photo_url?: string;
      side_photo_url?: string;
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // SECURITY: Validate both photos are from our private storage
    for (const url of [body.front_photo_url, body.side_photo_url]) {
      if (url && !url.startsWith(supabaseUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid image source' }), { status: 400, headers: corsHeaders });
      }
    }

    if (!body.front_photo_url) {
      return new Response(JSON.stringify({ error: 'Front photo is required' }), { status: 400, headers: corsHeaders });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI not configured');

    const systemPrompt = `You are a certified body composition analyst and fitness professional.
Analyze body photos to provide helpful, honest, and constructive fitness assessments.
Be specific and actionable. Use ranges for body fat estimates (never single numbers).
Be sensitive and professional — these are real people seeking fitness guidance.
Return ONLY valid JSON with no markdown or explanation.`;

    const userContent: unknown[] = [
      {
        type: 'text',
        text: `Analyze these body photos and provide a fitness assessment. Return this exact JSON:
{
  "body_fat_estimate_min": 18,
  "body_fat_estimate_max": 22,
  "posture_notes": "Slight forward head posture observed. Minor anterior pelvic tilt. Overall posture is reasonable.",
  "muscle_notes": "Decent upper body development. Legs appear undertrained relative to upper body. Core needs strengthening.",
  "recommendations": [
    "Add 2 dedicated leg days per week — legs are lagging behind upper body",
    "Include daily hip flexor stretches to address anterior pelvic tilt",
    "Strengthen posterior chain: deadlifts, RDLs, face pulls"
  ],
  "disclaimer": "This analysis is for fitness guidance only and is NOT a medical measurement. Results have ±5% margin of error. Always consult a healthcare professional for clinical assessments."
}

Be honest but constructive. Focus on actionable improvements.`,
      },
      {
        type: 'image_url',
        image_url: { url: body.front_photo_url, detail: 'high' },
      },
    ];

    if (body.side_photo_url) {
      userContent.push({
        type: 'image_url',
        image_url: { url: body.side_photo_url, detail: 'high' },
      });
    }

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
          { role: 'user', content: userContent },
        ],
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) throw new Error('Vision API error');

    const openaiData = await openaiRes.json();
    const analysis = JSON.parse(openaiData.choices[0].message.content);

    // Save scan to database
    const deleteAfter = new Date();
    deleteAfter.setDate(deleteAfter.getDate() + 90);

    const { data: savedScan, error: saveError } = await supabase
      .from('body_scans')
      .insert({
        user_id: user.id,
        front_photo_url: body.front_photo_url,
        side_photo_url: body.side_photo_url ?? null,
        body_fat_estimate_min: analysis.body_fat_estimate_min,
        body_fat_estimate_max: analysis.body_fat_estimate_max,
        posture_notes: analysis.posture_notes,
        muscle_notes: analysis.muscle_notes,
        recommendations: analysis.recommendations,
        ai_analysis_json: analysis,
      })
      .select()
      .single();

    if (saveError) throw new Error('Failed to save scan');

    return new Response(JSON.stringify({ scan: savedScan, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-body]', error);
    return new Response(
      JSON.stringify({ error: 'Body analysis failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
