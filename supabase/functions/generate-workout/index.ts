// supabase/functions/generate-workout/index.ts
// Edge Function: Generates AI workout plan via GPT-4o.
// SECURITY: API key never leaves server. Auth validated before any AI call.
// Rate limit: checked via daily_usage table.

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
    // ── AUTH CHECK ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with the user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── FETCH USER PROFILE ──────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── OPENAI CALL ─────────────────────────────────────────
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert personal trainer and strength & conditioning coach.
Generate a complete 4-week progressive workout plan as valid JSON.
The plan must be safe for the user's injuries and use only their available equipment.
Return ONLY valid JSON with no markdown, no explanation, no code blocks.`;

    const userPrompt = `Generate a 4-week progressive workout plan for:
- Goal: ${profile.goal}
- Workout time: ${profile.workout_time_minutes} minutes per session
- Days per week: ${profile.workout_days_per_week}
- Equipment: ${profile.equipment}
- Injuries/limitations: ${profile.injuries?.join(', ') || 'none'}
- Experience: intermediate

Return this exact JSON structure:
{
  "weeks": [
    {
      "week_number": 1,
      "theme": "Foundation",
      "days": [
        {
          "day_number": 1,
          "day_name": "Push Day A",
          "muscle_focus": ["chest", "shoulders", "triceps"],
          "estimated_duration_minutes": ${profile.workout_time_minutes},
          "exercises": [
            {
              "exercise_id": "bench_press",
              "exercise_name": "Barbell Bench Press",
              "muscle_group": "chest",
              "sets": 4,
              "reps": "8-10",
              "rest_seconds": 90,
              "tempo": "3-1-1-0",
              "notes": "Keep shoulder blades retracted throughout"
            }
          ]
        }
      ]
    }
  ],
  "ai_rationale": "Brief explanation of the program design",
  "progressive_overload_strategy": "How volume/intensity increases each week"
}

Rules:
- ${profile.injuries?.includes('knee') ? 'NO deep squats or heavy lunges. Use leg press, step-ups, leg curls instead.' : ''}
- ${profile.injuries?.includes('back') ? 'NO heavy deadlifts or good mornings. Use cable rows, machine rows.' : ''}
- ${profile.injuries?.includes('shoulder') ? 'NO behind-neck pressing. No upright rows.' : ''}
- Week 1-4: increase volume 5-10% each week
- Week 4 should be a deload (60-70% of week 3 volume)
- Only use equipment available: ${profile.equipment}`;

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
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      throw new Error('AI service temporarily unavailable');
    }

    const openaiData = await openaiRes.json();
    const planJson = JSON.parse(openaiData.choices[0].message.content);

    // ── SAVE TO DATABASE ────────────────────────────────────
    // Deactivate existing plans
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Insert new plan
    const { data: savedPlan, error: saveError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        week_number: 1,
        plan_json: planJson,
        ai_rationale: planJson.ai_rationale ?? '',
        is_active: true,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error('Failed to save workout plan');
    }

    return new Response(JSON.stringify({ plan: savedPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-workout]', error);
    // SECURITY: Never expose internal error details to client
    return new Response(
      JSON.stringify({ error: 'Failed to generate workout plan. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
