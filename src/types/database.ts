// src/types/database.ts
// Types that mirror the Supabase database schema exactly

export interface UserProfile {
  id: string; // UUID = auth.users.id
  name: string;
  goal: 'weight_loss' | 'muscle_gain' | 'general_fitness' | 'maintenance' | null;
  workout_time_minutes: 15 | 30 | 45 | 60 | null;
  workout_days_per_week: number | null;
  equipment: 'full_gym' | 'home_basic' | 'no_equipment' | 'mix' | null;
  diet_budget_inr: '100-200' | '200-400' | '400-700' | '700+' | null;
  injuries: string[];
  biggest_struggle: string | null;
  dietary_preference: 'veg' | 'non_veg' | 'vegan' | 'eggetarian';
  onboarding_complete: boolean;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  week_number: number;
  plan_json: Record<string, unknown>;
  ai_rationale: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id: string | null;
  day_name: string | null;
  exercises_completed: Record<string, unknown>[];
  duration_minutes: number | null;
  fatigue_score: number | null;
  calories_burned: number | null;
  notes: string | null;
  completed_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_photo_url: string | null;
  food_items: Record<string, unknown>[];
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  total_fiber_g: number | null;
  ai_confidence: number | null;
  manually_edited: boolean;
  logged_at: string;
}

export interface DietPlan {
  id: string;
  user_id: string;
  budget_inr: string;
  dietary_preference: string;
  plan_json: Record<string, unknown>;
  week_start: string;
  is_active: boolean;
  created_at: string;
}

export interface BodyScan {
  id: string;
  user_id: string;
  front_photo_url: string | null;
  side_photo_url: string | null;
  body_fat_estimate_min: number | null;
  body_fat_estimate_max: number | null;
  posture_notes: string | null;
  muscle_notes: string | null;
  recommendations: string[];
  ai_analysis_json: Record<string, unknown> | null;
  delete_after: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url: string | null;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  note: string | null;
  logged_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'elite';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_start: string;
  trial_end: string;
  current_period_end: string | null;
  revenuecat_customer_id: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  usage_date: string;
  food_scans_count: number;
  ai_messages_count: number;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_name: string;
  weight_kg: number | null;
  reps: number | null;
  achieved_at: string;
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string; name: string };
        Update: Partial<UserProfile>;
      };
      workout_plans: {
        Row: WorkoutPlan;
        Insert: Omit<WorkoutPlan, 'id' | 'created_at'>;
        Update: Partial<WorkoutPlan>;
      };
      workout_sessions: {
        Row: WorkoutSession;
        Insert: Omit<WorkoutSession, 'id' | 'completed_at'>;
        Update: Partial<WorkoutSession>;
      };
      nutrition_logs: {
        Row: NutritionLog;
        Insert: Omit<NutritionLog, 'id' | 'logged_at'>;
        Update: Partial<NutritionLog>;
      };
      diet_plans: {
        Row: DietPlan;
        Insert: Omit<DietPlan, 'id' | 'created_at'>;
        Update: Partial<DietPlan>;
      };
      body_scans: {
        Row: BodyScan;
        Insert: Omit<BodyScan, 'id' | 'created_at' | 'delete_after'>;
        Update: Partial<BodyScan>;
      };
      ai_conversations: {
        Row: AIConversation;
        Insert: Omit<AIConversation, 'id' | 'created_at'>;
        Update: Partial<AIConversation>;
      };
      weight_logs: {
        Row: WeightLog;
        Insert: Omit<WeightLog, 'id' | 'logged_at'>;
        Update: Partial<WeightLog>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Subscription>;
      };
      daily_usage: {
        Row: DailyUsage;
        Insert: Omit<DailyUsage, 'id'>;
        Update: Partial<DailyUsage>;
      };
      personal_records: {
        Row: PersonalRecord;
        Insert: Omit<PersonalRecord, 'id' | 'achieved_at'>;
        Update: Partial<PersonalRecord>;
      };
    };
  };
}
