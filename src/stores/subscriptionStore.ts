// src/stores/subscriptionStore.ts
// Manages subscription state, trial status, and feature gating.
// Subscription status is verified server-side on each app open.

import { create } from 'zustand';
import { supabase } from '@services/supabase';
import type { Subscription, SubscriptionTier, SubscriptionStatus } from '@types/index';

interface SubscriptionState {
  subscription: Subscription | null;
  isLoading: boolean;

  // Computed helpers
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isTrialActive: boolean;
  isPro: boolean;
  isElite: boolean;
  daysLeftInTrial: number;

  // Actions
  fetchSubscription: (userId: string) => Promise<void>;
  canUseFeature: (feature: 'food_scan' | 'ai_message') => boolean;
  checkUsageLimit: (
    userId: string,
    feature: 'food_scans_count' | 'ai_messages_count',
  ) => Promise<{ allowed: boolean; count: number; limit: number }>;
}

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  subscription: null,
  isLoading: false,

  // Computed from subscription
  get tier() {
    return get().subscription?.tier ?? 'free';
  },
  get status() {
    return get().subscription?.status ?? 'trial';
  },
  get isTrialActive() {
    const sub = get().subscription;
    if (!sub) return false;
    return sub.status === 'trial' && new Date(sub.trial_end) > new Date();
  },
  get isPro() {
    const { subscription } = get();
    if (!subscription) return false;
    const isActive = subscription.status === 'active' || get().isTrialActive;
    return isActive && (subscription.tier === 'pro' || subscription.tier === 'elite');
  },
  get isElite() {
    const { subscription } = get();
    if (!subscription) return false;
    return subscription.status === 'active' && subscription.tier === 'elite';
  },
  get daysLeftInTrial() {
    const sub = get().subscription;
    if (!sub || sub.status !== 'trial') return 0;
    const msLeft = new Date(sub.trial_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  },

  fetchSubscription: async (userId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        set({ subscription: data });
      }
    } catch (error) {
      console.error('[Subscription] Fetch error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  canUseFeature: (feature) => {
    const { isPro, isTrialActive } = get();
    // Trial or paid = full access
    if (isPro || isTrialActive) return true;
    // Free users can use basic features — limits checked separately
    return true;
  },

  checkUsageLimit: async (userId, feature) => {
    const today = new Date().toISOString().split('T')[0];
    const { isPro, isTrialActive } = get();

    // Pro/trial users: unlimited
    if (isPro || isTrialActive) {
      return { allowed: true, count: 0, limit: Infinity };
    }

    const limit = feature === 'food_scans_count' ? 5 : 10;

    try {
      // Upsert today's usage row
      const { data, error } = await supabase
        .from('daily_usage')
        .select(feature)
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist yet — create it
        await supabase.from('daily_usage').insert({
          user_id: userId,
          usage_date: today,
          food_scans_count: 0,
          ai_messages_count: 0,
        });
        return { allowed: true, count: 0, limit };
      }

      const count = (data as Record<string, number> | null)?.[feature] ?? 0;
      return { allowed: count < limit, count, limit };
    } catch {
      // On error, allow the action (fail open for better UX)
      return { allowed: true, count: 0, limit };
    }
  },
}));
