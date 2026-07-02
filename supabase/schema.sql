-- ============================================================
-- APEX FITNESS APP — COMPLETE SUPABASE SQL SCHEMA
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT CHECK (goal IN ('weight_loss','muscle_gain','general_fitness','maintenance')),
  workout_time_minutes INTEGER CHECK (workout_time_minutes IN (15,30,45,60)),
  workout_days_per_week INTEGER CHECK (workout_days_per_week BETWEEN 2 AND 6),
  equipment TEXT CHECK (equipment IN ('full_gym','home_basic','no_equipment','mix')),
  diet_budget_inr TEXT CHECK (diet_budget_inr IN ('100-200','200-400','400-700','700+')),
  injuries TEXT[] DEFAULT '{}',
  biggest_struggle TEXT,
  dietary_preference TEXT CHECK (dietary_preference IN ('veg','non_veg','vegan','eggetarian')) DEFAULT 'non_veg',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  height_cm NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  plan_json JSONB NOT NULL,
  ai_rationale TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_active ON workout_plans(user_id, is_active);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES workout_plans(id),
  day_name TEXT,
  exercises_completed JSONB DEFAULT '[]',
  duration_minutes INTEGER,
  fatigue_score INTEGER CHECK (fatigue_score BETWEEN 1 AND 10),
  calories_burned INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) NOT NULL,
  food_photo_url TEXT,
  food_items JSONB DEFAULT '[]',
  total_calories INTEGER,
  total_protein_g NUMERIC(6,1),
  total_carbs_g NUMERIC(6,1),
  total_fat_g NUMERIC(6,1),
  total_fiber_g NUMERIC(6,1),
  ai_confidence NUMERIC(4,2),
  manually_edited BOOLEAN DEFAULT FALSE,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS diet_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_inr TEXT NOT NULL,
  dietary_preference TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  week_start DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diet_plans_user_active ON diet_plans(user_id, is_active);

CREATE TABLE IF NOT EXISTS body_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  front_photo_url TEXT,
  side_photo_url TEXT,
  body_fat_estimate_min NUMERIC(4,1),
  body_fat_estimate_max NUMERIC(4,1),
  posture_notes TEXT,
  muscle_notes TEXT,
  recommendations TEXT[],
  ai_analysis_json JSONB,
  delete_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_body_scans_user_id ON body_scans(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user','assistant')) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_date ON ai_conversations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tier TEXT CHECK (tier IN ('free','pro','elite')) DEFAULT 'free',
  status TEXT CHECK (status IN ('trial','active','expired','cancelled')) DEFAULT 'trial',
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_end TIMESTAMPTZ,
  revenuecat_customer_id TEXT,
  razorpay_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE DEFAULT CURRENT_DATE,
  food_scans_count INTEGER DEFAULT 0,
  ai_messages_count INTEGER DEFAULT 0,
  UNIQUE(user_id, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, usage_date);

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC(5,2),
  reps INTEGER,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_personal_records_user ON personal_records(user_id, exercise_name);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "own_profile" ON user_profiles;
  DROP POLICY IF EXISTS "own_workout_plans" ON workout_plans;
  DROP POLICY IF EXISTS "own_sessions" ON workout_sessions;
  DROP POLICY IF EXISTS "own_nutrition" ON nutrition_logs;
  DROP POLICY IF EXISTS "own_diet_plans" ON diet_plans;
  DROP POLICY IF EXISTS "own_body_scans" ON body_scans;
  DROP POLICY IF EXISTS "own_conversations" ON ai_conversations;
  DROP POLICY IF EXISTS "own_weight_logs" ON weight_logs;
  DROP POLICY IF EXISTS "own_subscription" ON subscriptions;
  DROP POLICY IF EXISTS "own_usage" ON daily_usage;
  DROP POLICY IF EXISTS "own_records" ON personal_records;
END $$;

-- Create RLS policies
CREATE POLICY "own_profile" ON user_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own_workout_plans" ON workout_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_nutrition" ON nutrition_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_diet_plans" ON diet_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_body_scans" ON body_scans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_weight_logs" ON weight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_usage" ON daily_usage FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_records" ON personal_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── HELPER FUNCTIONS (for Edge Functions) ───────────────────

-- Increment food scan count (called from Edge Function with service role)
CREATE OR REPLACE FUNCTION increment_food_scan(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_usage (user_id, usage_date, food_scans_count, ai_messages_count)
  VALUES (p_user_id, p_date, 1, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET food_scans_count = daily_usage.food_scans_count + 1;
END;
$$;

-- Increment AI message count
CREATE OR REPLACE FUNCTION increment_ai_message(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_usage (user_id, usage_date, food_scans_count, ai_messages_count)
  VALUES (p_user_id, p_date, 0, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET ai_messages_count = daily_usage.ai_messages_count + 1;
END;
$$;

-- Auto-update updated_at on user_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── AUTO BODY PHOTO DELETION (pg_cron) ─────────────────────
-- Enable pg_cron extension in Supabase Dashboard first (Database → Extensions)
-- Then run this:

-- SELECT cron.schedule(
--   'delete-expired-body-scans',
--   '0 3 * * *',  -- Daily at 3 AM UTC
--   $$
--     -- Delete storage files for expired scans
--     DELETE FROM body_scans
--     WHERE delete_after < NOW();
--   $$
-- );

-- ─── STORAGE BUCKETS ─────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage → New Bucket:
-- 1. "food-photos"    → Private, 10MB limit
-- 2. "body-scans"     → Private, 20MB limit
-- 3. "avatars"        → Public, 5MB limit

-- Storage RLS policies (run after creating buckets):
-- INSERT policy: users can upload to their own folder
-- SELECT policy: users can only read their own files
-- Example for food-photos bucket:
/*
CREATE POLICY "Users upload own food photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
*/
