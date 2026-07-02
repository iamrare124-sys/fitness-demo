// src/services/supabase.ts
// Supabase client with SecureStore adapter for token persistence.
// SECURITY: Uses expo-secure-store (encrypted), NOT AsyncStorage.
// The anon key is safe to expose — all security enforced by RLS policies.

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Database } from '@types/database';

// ─── CONFIG ──────────────────────────────────────────────────
const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.supabaseUrl as string | undefined) ?? '';
const supabaseAnonKey = (extra.supabaseAnonKey as string | undefined) ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[APEX] Supabase URL or anon key missing. ' +
    'Check your .env file and app.config.ts extra fields.',
  );
}

// ─── SECURE STORE ADAPTER ────────────────────────────────────
// SecureStore keys have a 256-char limit and can't contain dots.
// We sanitize the key to comply with SecureStore requirements.
const sanitizeKey = (key: string): string =>
  key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 250);

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(sanitizeKey(key));
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(sanitizeKey(key), value);
    } catch (error) {
      console.error('[SecureStore] Failed to set item:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(sanitizeKey(key));
    } catch {
      // Key may not exist — ignore
    }
  },
};

// ─── SUPABASE CLIENT ─────────────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // SECURITY: flowType PKCE is more secure than implicit for mobile
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'apex-fitness-rn/1.0.0',
    },
  },
  // Disable realtime to avoid ws/stream issues on React Native
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

export default supabase;
