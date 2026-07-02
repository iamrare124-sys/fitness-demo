// supabase/functions/ai-coach-chat/index.ts
// Edge Function: AI Coach chat with GPT-4o / GPT-4o-mini routing.
// Streams responses back. Injects full user context.
// SECURITY: Auth enforced, rate limits checked, context sanitized.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Route to cheaper model for simple questions
function routeModel(message: string): 'gpt-4o' | 'gpt-4o-mini' {
  const complexKeywords = [
    'injury', 'pain', 'hurt', 'medical', 'modify plan', 'change my workout',
    'analyze', 'week', 'progress', 'plateau', 'why am i', 'nutrition plan',
    'macros', 'calories target', 'diet plan',
  ];
  const lower = message.toLowerCase();
  return complexKeywords.some((kw) => lower.includes(kw)) ? 'gpt-4o' : 'gpt-4o-mini';
}

// Sanitize user input - strip HTML, limit length
function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[^\w\s.,!?'"()\-:;@#%&*]/g, ' ') // Keep safe chars
    .substring(0, 2000) // Max 2000 chars per message
    .trim();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── AUTH ────────────────────────────────────────────────
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

    // ── RATE LIMIT ──────────────────────────────────────────
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
        .select('ai_messages_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single();

      if ((usage?.ai_messages_count ?? 0) >= 10) {
        return new Response(
          JSON.stringify({ error: 'Daily message limit reached. Upgrade to Pro for unlimited coaching.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── GET REQUEST BODY ────────────────────────────────────
    const body = await req.json() as {
      message?: string;
      image_url?: string;
      conversation_history?: Array<{ role: string; content: string }>;
    };

    const rawMessage = body.message ?? '';
    const message = sanitizeInput(rawMessage);

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── FETCH CONTEXT ────────────────────────────────────────
    const [profileRes, workoutRes, nutritionRes, bodyRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('workout_plans').select('plan_json, created_at').eq('user_id', user.id).eq('is_active', true).single(),
      supabase.from('nutrition_logs').select('total_calories, total_protein_g, meal_type, logged_at').eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('logged_at', { ascending: false }).limit(20),
      supabase.from('body_scans').select('body_fat_estimate_min, body_fat_estimate_max, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    ]);

    const profile = profileRes.data;
    const workoutPlan = workoutRes.data;
    const recentNutrition = nutritionRes.data ?? [];
    const latestBodyScan = bodyRes.data?.[0];

    // ── BUILD SYSTEM PROMPT WITH CONTEXT ────────────────────
    const systemPrompt = `You are APEX Coach — a world-class AI personal trainer and nutritionist.
You are friendly, motivating, direct, and science-based. You speak like a knowledgeable friend, not a robot.

USER CONTEXT:
- Name: ${profile?.name ?? 'Champion'}
- Goal: ${profile?.goal?.replace('_', ' ') ?? 'general fitness'}
- Equipment: ${profile?.equipment ?? 'unknown'}
- Injuries: ${profile?.injuries?.join(', ') || 'none'}
- Diet budget: ₹${profile?.diet_budget_inr ?? '200-400'}/day
- Dietary preference: ${profile?.dietary_preference ?? 'non-veg'}
- Subscription: ${subscription?.tier ?? 'free'}

${workoutPlan ? `CURRENT WORKOUT PLAN: Active (generated ${new Date(workoutPlan.created_at).toLocaleDateString()})` : 'WORKOUT PLAN: None yet'}

RECENT NUTRITION (7 days):
${recentNutrition.length > 0
  ? `Total logs: ${recentNutrition.length}. Avg daily calories: ~${Math.round(recentNutrition.reduce((s, l) => s + (l.total_calories ?? 0), 0) / 7)}`
  : 'No nutrition logs yet'}

${latestBodyScan ? `BODY SCAN: Last scan showed ${latestBodyScan.body_fat_estimate_min}-${latestBodyScan.body_fat_estimate_max}% body fat` : 'BODY SCAN: None yet'}

RULES:
1. Always give actionable, specific advice relevant to THIS user's context above
2. For injury questions: always recommend consulting a doctor first, then give safe alternatives
3. Keep responses concise and mobile-friendly (no huge walls of text)
4. Use emojis sparingly but naturally
5. NEVER claim to be a medical professional
6. If asked about medical conditions, redirect to a healthcare professional`;

    // ── BUILD MESSAGES ARRAY ─────────────────────────────────
    const conversationHistory = (body.conversation_history ?? []).slice(-10); // Last 10 messages only

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: message },
    ];

    // If user sent an image, add it (only from Supabase storage)
    if (body.image_url && typeof body.image_url === 'string' &&
        body.image_url.startsWith(Deno.env.get('SUPABASE_URL') ?? '')) {
      userContent.push({ type: 'image_url', image_url: { url: body.image_url } });
    }

    const model = routeModel(message);

    // ── OPENAI STREAMING CALL ────────────────────────────────
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI not configured');

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userContent },
        ],
        max_tokens: 600,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!openaiRes.ok) throw new Error('OpenAI stream error');

    // ── SAVE MESSAGE TO DB ───────────────────────────────────
    // Save user message
    await supabase.from('ai_conversations').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      image_url: body.image_url ?? null,
      model_used: model,
    });

    // Increment usage count
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_ai_message', { p_user_id: user.id, p_date: today });

    // Stream the response back
    return new Response(openaiRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Model-Used': model,
      },
    });
  } catch (error) {
    console.error('[ai-coach-chat]', error);
    return new Response(
      JSON.stringify({ error: 'Coach is unavailable right now. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
