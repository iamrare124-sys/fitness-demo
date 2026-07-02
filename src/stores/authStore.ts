// src/stores/authStore.ts
// Central auth state management with Zustand.
// SECURITY: All tokens stored via SecureStore (encrypted).
// Rate limiting: 3 auth failures → 30-second lockout.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@services/supabase';
import type { UserProfile } from '@types/database';

// ─── RATE LIMIT STATE ────────────────────────────────────────
// Stored in memory (not persisted) — resets on app restart
const AUTH_ATTEMPT_STATE = {
  count: 0,
  lockedUntil: 0,
};

const MAX_AUTH_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000;

export function checkAuthRateLimit(): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  if (AUTH_ATTEMPT_STATE.lockedUntil > now) {
    return {
      allowed: false,
      remainingMs: AUTH_ATTEMPT_STATE.lockedUntil - now,
    };
  }
  return { allowed: true, remainingMs: 0 };
}

function recordAuthFailure(): void {
  AUTH_ATTEMPT_STATE.count += 1;
  if (AUTH_ATTEMPT_STATE.count >= MAX_AUTH_ATTEMPTS) {
    AUTH_ATTEMPT_STATE.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    AUTH_ATTEMPT_STATE.count = 0;
  }
}

function resetAuthAttempts(): void {
  AUTH_ATTEMPT_STATE.count = 0;
  AUTH_ATTEMPT_STATE.lockedUntil = 0;
}

// ─── STORE TYPES ─────────────────────────────────────────────
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  setProfile: (profile: UserProfile) => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

// ─── STORE ───────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    initialize: async () => {
      set({ isLoading: true });
      try {
        // Get existing session from SecureStore
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          set({ user: session.user, session });
          // Fetch user profile
          await get().refreshProfile();
        }

        // Subscribe to auth changes
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            set({ user: newSession.user, session: newSession });
            await get().refreshProfile();
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, session: null, profile: null });
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            set({ session: newSession });
          } else if (event === 'USER_UPDATED' && newSession?.user) {
            set({ user: newSession.user });
          }
        });
      } catch (error) {
        console.error('[Auth] Initialize error:', error);
        set({ error: 'Failed to initialize session' });
      } finally {
        set({ isLoading: false, isInitialized: true });
      }
    },

    signUp: async (email, password, name) => {
      const { allowed, remainingMs } = checkAuthRateLimit();
      if (!allowed) {
        const secs = Math.ceil(remainingMs / 1000);
        return { error: `Too many attempts. Please wait ${secs} seconds.` };
      }

      set({ isLoading: true, error: null });
      try {
        // SECURITY: Validate inputs before sending to Supabase
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim().substring(0, 100).replace(/<[^>]*>/g, '');

        if (!cleanEmail || !cleanEmail.includes('@')) {
          return { error: 'Please enter a valid email address.' };
        }
        if (password.length < 8) {
          return { error: 'Password must be at least 8 characters.' };
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name: cleanName },
          },
        });

        if (error) {
          recordAuthFailure();
          return { error: mapAuthError(error.message) };
        }

        if (data.user) {
          resetAuthAttempts();
          // Create user profile row
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              name: cleanName,
              onboarding_complete: false,
            });

          if (profileError) {
            console.error('[Auth] Profile creation error:', profileError);
            // Non-fatal — profile can be created during onboarding
          }

          // Create initial subscription (trial)
          await supabase.from('subscriptions').insert({
            user_id: data.user.id,
            tier: 'free',
            status: 'trial',
          });
        }

        return { error: null };
      } catch {
        recordAuthFailure();
        return { error: 'An unexpected error occurred. Please try again.' };
      } finally {
        set({ isLoading: false });
      }
    },

    signIn: async (email, password) => {
      const { allowed, remainingMs } = checkAuthRateLimit();
      if (!allowed) {
        const secs = Math.ceil(remainingMs / 1000);
        return { error: `Too many attempts. Please wait ${secs} seconds.` };
      }

      set({ isLoading: true, error: null });
      try {
        const cleanEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          recordAuthFailure();
          return { error: mapAuthError(error.message) };
        }

        if (data.user) {
          resetAuthAttempts();
          set({ user: data.user, session: data.session });
          await get().refreshProfile();
        }

        return { error: null };
      } catch {
        recordAuthFailure();
        return { error: 'An unexpected error occurred. Please try again.' };
      } finally {
        set({ isLoading: false });
      }
    },

    signOut: async () => {
      set({ isLoading: true });
      try {
        await supabase.auth.signOut();
        // Clear all local state
        set({
          user: null,
          session: null,
          profile: null,
          error: null,
        });
      } catch (error) {
        console.error('[Auth] Sign out error:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    resetPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        const cleanEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: 'apex://reset-password',
        });

        if (error) {
          return { error: mapAuthError(error.message) };
        }
        return { error: null };
      } catch {
        return { error: 'An unexpected error occurred. Please try again.' };
      } finally {
        set({ isLoading: false });
      }
    },

    setProfile: (profile) => set({ profile }),

    clearError: () => set({ error: null }),

    refreshProfile: async () => {
      const { user } = get();
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          set({ profile: data });
        }
      } catch (error) {
        console.error('[Auth] Profile refresh error:', error);
      }
    },
  })),
);

// ─── ERROR MESSAGE MAPPING ────────────────────────────────────
// SECURITY: Never expose raw Supabase/internal error messages to users
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('weak password')) {
    return 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'No internet connection. Please check your connection and try again.';
  }

  // Generic fallback — never expose raw error
  return 'Something went wrong. Please try again.';
}

// ─── SELECTORS ───────────────────────────────────────────────
export const selectUser = (state: AuthState) => state.user;
export const selectProfile = (state: AuthState) => state.profile;
export const selectIsLoggedIn = (state: AuthState) => !!state.user;
export const selectOnboardingComplete = (state: AuthState) =>
  state.profile?.onboarding_complete ?? false;
