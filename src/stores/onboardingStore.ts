// src/stores/onboardingStore.ts
// Manages multi-step onboarding state across screens.
// Data is committed to Supabase on final step completion.

import { create } from 'zustand';
import { supabase } from '@services/supabase';
import type { OnboardingData, FitnessGoal, EquipmentType, DietBudget, InjuryType, BiggestStruggle } from '@types/index';

interface OnboardingState {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setGoal: (goal: FitnessGoal) => void;
  setWorkoutTime: (minutes: 15 | 30 | 45 | 60) => void;
  setWorkoutDays: (days: 2 | 3 | 4 | 5 | 6) => void;
  setEquipment: (equipment: EquipmentType) => void;
  setBudget: (budget: DietBudget) => void;
  setInjuries: (injuries: InjuryType[]) => void;
  setBiggestStruggle: (struggle: BiggestStruggle) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitOnboarding: (userId: string) => Promise<{ error: string | null }>;
  reset: () => void;
}

const INITIAL_DATA: OnboardingData = {};

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  data: INITIAL_DATA,
  currentStep: 1,
  totalSteps: 7,
  isSubmitting: false,
  error: null,

  setGoal: (goal) => set((s) => ({ data: { ...s.data, goal } })),
  setWorkoutTime: (workout_time_minutes) =>
    set((s) => ({ data: { ...s.data, workout_time_minutes } })),
  setWorkoutDays: (workout_days_per_week) =>
    set((s) => ({ data: { ...s.data, workout_days_per_week } })),
  setEquipment: (equipment) => set((s) => ({ data: { ...s.data, equipment } })),
  setBudget: (diet_budget_inr) => set((s) => ({ data: { ...s.data, diet_budget_inr } })),
  setInjuries: (injuries) => set((s) => ({ data: { ...s.data, injuries } })),
  setBiggestStruggle: (biggest_struggle) =>
    set((s) => ({ data: { ...s.data, biggest_struggle } })),

  nextStep: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, s.totalSteps),
    })),

  prevStep: () =>
    set((s) => ({
      currentStep: Math.max(s.currentStep - 1, 1),
    })),

  submitOnboarding: async (userId) => {
    const { data } = get();
    set({ isSubmitting: true, error: null });

    try {
      // Validate required fields
      if (!data.goal || !data.workout_time_minutes || !data.workout_days_per_week ||
          !data.equipment || !data.diet_budget_inr || !data.injuries || !data.biggest_struggle) {
        return { error: 'Please complete all steps before continuing.' };
      }

      // Update user profile with onboarding data
      const { error } = await supabase
        .from('user_profiles')
        .update({
          goal: data.goal,
          workout_time_minutes: data.workout_time_minutes,
          workout_days_per_week: data.workout_days_per_week,
          equipment: data.equipment,
          diet_budget_inr: data.diet_budget_inr,
          injuries: data.injuries,
          biggest_struggle: data.biggest_struggle,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { error: 'Failed to save your preferences. Please try again.' };
      }

      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred. Please try again.' };
    } finally {
      set({ isSubmitting: false });
    }
  },

  reset: () => set({ data: INITIAL_DATA, currentStep: 1, error: null }),
}));
