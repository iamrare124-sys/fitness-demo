// supabase/functions/generate-diet-plan/index.ts
// Generates a 7-day Indian meal plan with budget constraints via GPT-4o.

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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: corsHeaders });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI not configured');

    const budgetMap: Record<string, string> = {
      '100-200': '₹100-200 per day total',
      '200-400': '₹200-400 per day total',
      '400-700': '₹400-700 per day total',
      '700+': '₹700+ per day total',
    };

    const systemPrompt = `You are an expert Indian nutritionist and meal planner.
You create realistic, delicious, budget-conscious Indian meal plans.
You understand Indian ingredients, cooking methods, and regional cuisines.
Return ONLY valid JSON with no markdown or explanation.`;

    const userPrompt = `Create a 7-day Indian meal plan for:
- Goal: ${profile.goal}
- Daily budget: ${budgetMap[profile.diet_budget_inr ?? '200-400']}
- Dietary preference: ${profile.dietary_preference}
- Budget priority: maximize protein per rupee

Return this exact JSON structure:
{
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "meal_name": "Oats Upma with Sprouts",
        "ingredients": ["oats 50g", "mixed sprouts 30g", "onion", "green chilli", "mustard seeds"],
        "portion_sizes": ["1 bowl", "1 side"],
        "calories": 320,
        "protein": 14,
        "carbs": 45,
        "fat": 8,
        "cost_inr": 25,
        "recipe_steps": ["Dry roast oats 2min", "Temper mustard seeds", "Add vegetables", "Add oats and water", "Cook 5 min"],
        "prep_time_minutes": 10,
        "emoji": "🥣"
      },
      "lunch": { ... same structure ... },
      "dinner": { ... same structure ... },
      "snacks": { ... same structure ... }
    }
  ],
  "weekly_avg_calories": 1850,
  "weekly_avg_protein": 120,
  "weekly_total_cost_inr": 1400,
  "shopping_list": [
    {
      "item": "Chicken breast",
      "quantity": "500g",
      "estimated_cost_inr": 150,
      "category": "protein"
    }
  ]
}

Rules:
- ${profile.dietary_preference === 'veg' ? 'VEGETARIAN ONLY: No meat, no eggs, no fish' : ''}
- ${profile.dietary_preference === 'vegan' ? 'VEGAN ONLY: No animal products including dairy' : ''}
- ${profile.dietary_preference === 'eggetarian' ? 'EGGS allowed, no meat or fish' : ''}
- All meals must be Indian cuisine or Indian-adapted
- Budget must be strictly respected across all 4 meals per day
- No same meal repeated within 3 consecutive days
- Prioritize: dal, eggs, chicken (if non-veg), paneer, curd for protein
- Include seasonal Indian vegetables
- Recipes must be home-cookable in under 30 minutes`;

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
        max_tokens: 6000,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) throw new Error('OpenAI error');

    const openaiData = await openaiRes.json();
    const planJson = JSON.parse(openaiData.choices[0].message.content);

    // Save to database
    await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', user.id);

    const weekStart = new Date().toISOString().split('T')[0];
    const { data: savedPlan, error: saveError } = await supabase
      .from('diet_plans')
      .insert({
        user_id: user.id,
        budget_inr: profile.diet_budget_inr ?? '200-400',
        dietary_preference: profile.dietary_preference ?? 'non_veg',
        plan_json: planJson,
        week_start: weekStart,
        is_active: true,
      })
      .select()
      .single();

    if (saveError) throw new Error('Failed to save diet plan');

    return new Response(JSON.stringify({ plan: savedPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-diet-plan]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate diet plan. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
