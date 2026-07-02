// src/types/index.ts
// Central type exports for the APEX app

export * from './database';
export * from './api';
export * from './navigation';

// ─── SUBSCRIPTION TIERS ──────────────────────────────────────
export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

// ─── USER GOAL + PROFILE TYPES ───────────────────────────────
export type FitnessGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'general_fitness'
  | 'maintenance';

export type EquipmentType =
  | 'full_gym'
  | 'home_basic'
  | 'no_equipment'
  | 'mix';

export type DietBudget =
  | '100-200'
  | '200-400'
  | '400-700'
  | '700+';

export type DietaryPreference =
  | 'veg'
  | 'non_veg'
  | 'vegan'
  | 'eggetarian';

export type InjuryType =
  | 'none'
  | 'knee'
  | 'back'
  | 'shoulder'
  | 'other';

export type BiggestStruggle =
  | 'consistency'
  | 'dont_know_what_to_do'
  | 'nutrition_confusion'
  | 'no_results';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Gender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say';

// ─── WORKOUT TYPES ───────────────────────────────────────────
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string[];
  equipment_needed: string;
  difficulty_level: DifficultyLevel;
  youtube_tutorial_id: string;
  image_url: string;
  correct_form_image_url?: string;
  wrong_form_image_url?: string;
  correct_form_cues: string[];
  common_mistakes: string[];
  breathing_pattern: string;
}

export interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps: string; // "8-12" or "10" or "AMRAP"
  rest_seconds: number;
  tempo?: string; // "3-1-2-0"
  notes?: string;
  weight_kg?: number;
  superset_with?: string;
}

export interface WorkoutDay {
  day_number: number;
  day_name: string; // "Push Day A"
  muscle_focus: string[];
  estimated_duration_minutes: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutWeek {
  week_number: number;
  theme: string; // "Foundation", "Progression", "Peak", "Deload"
  days: WorkoutDay[];
}

export interface WorkoutPlanJson {
  weeks: WorkoutWeek[];
  ai_rationale: string;
  progressive_overload_strategy: string;
}

// ─── NUTRITION TYPES ─────────────────────────────────────────
export interface FoodItem {
  name: string;
  portion_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface NutritionScanResult {
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence_score: number;
  notes: string;
}

// ─── DIET PLAN TYPES ─────────────────────────────────────────
export interface MealPlan {
  meal_name: string;
  ingredients: string[];
  portion_sizes: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cost_inr: number;
  recipe_steps: string[];
  prep_time_minutes: number;
  emoji?: string;
}

export interface DayMealPlan {
  day: string;
  breakfast: MealPlan;
  lunch: MealPlan;
  dinner: MealPlan;
  snacks: MealPlan;
  total_calories: number;
  total_protein: number;
  total_cost_inr: number;
}

export interface DietPlanJson {
  days: DayMealPlan[];
  weekly_avg_calories: number;
  weekly_avg_protein: number;
  weekly_total_cost_inr: number;
  shopping_list: ShoppingItem[];
}

export interface ShoppingItem {
  item: string;
  quantity: string;
  estimated_cost_inr: number;
  category: string;
}

// ─── BODY SCAN TYPES ─────────────────────────────────────────
export interface BodyScanAnalysis {
  body_fat_estimate_min: number;
  body_fat_estimate_max: number;
  posture_notes: string;
  muscle_notes: string;
  recommendations: string[];
  disclaimer: string;
}

// ─── AI CHAT TYPES ───────────────────────────────────────────
export type AIModel = 'gpt-4o' | 'gpt-4o-mini';
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  image_url?: string;
  model_used?: AIModel;
  created_at: string;
  is_streaming?: boolean;
}

// ─── ACHIEVEMENT BADGE TYPES ─────────────────────────────────
export type BadgeId =
  | 'first_workout'
  | 'streak_7'
  | 'streak_30'
  | 'weight_loss_2kg'
  | 'personal_record'
  | 'first_body_scan'
  | 'meal_log_7_days';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
  earned_at?: string;
}

// ─── ONBOARDING ──────────────────────────────────────────────
export interface OnboardingData {
  goal?: FitnessGoal;
  workout_time_minutes?: 15 | 30 | 45 | 60;
  workout_days_per_week?: 2 | 3 | 4 | 5 | 6;
  equipment?: EquipmentType;
  diet_budget_inr?: DietBudget;
  injuries?: InjuryType[];
  biggest_struggle?: BiggestStruggle;
}

// ─── API RESPONSE WRAPPERS ────────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;
