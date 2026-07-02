// app/_layout.tsx
// Root layout: fonts, error tracking, analytics, query client, auth gate.
// This file runs on every app load before any screen renders.

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@stores/subscriptionStore';
import { COLORS } from '@constants/design';

// ─── SENTRY INITIALIZATION ───────────────────────────────────
const sentryDsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // SECURITY: Never log sensitive user data in breadcrumbs
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.category === 'console' && !__DEV__) return null;
      return breadcrumb;
    },
  });
}

// ─── REACT QUERY CLIENT ──────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,        // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if ((error as { status?: number })?.status === 401) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// ─── KEEP SPLASH VISIBLE UNTIL READY ─────────────────────────
SplashScreen.preventAutoHideAsync();

// ─── AUTH GUARD ───────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized, initialize } = useAuthStore();
  const { fetchSubscription } = useSubscriptionStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user) {
      // Not logged in → go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (user && !profile?.onboarding_complete) {
      // Logged in but no onboarding → go to onboarding
      if (!inOnboarding) {
        router.replace('/(onboarding)/goal');
      }
    } else if (user && profile?.onboarding_complete) {
      // Fully onboarded → go to app
      if (inAuthGroup || inOnboarding) {
        router.replace('/(tabs)');
      }
      // Fetch subscription on every valid session
      fetchSubscription(user.id);
    }
  }, [user, profile, isInitialized, segments, router, fetchSubscription]);

  return <>{children}</>;
}

// ─── ROOT LAYOUT COMPONENT ───────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'SpaceGrotesk-Bold': require('../assets/fonts/SpaceGrotesk-Bold.ttf'),
    'SpaceGrotesk-Medium': require('../assets/fonts/SpaceGrotesk-Medium.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  const { isInitialized } = useAuthStore();

  useEffect(() => {
    if ((fontsLoaded || fontError) && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isInitialized]);

  if (!fontsLoaded && !fontError) {
    return null; // Splash stays visible
  }

  const posthogKey = Constants.expoConfig?.extra?.posthogKey as string | undefined;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PostHogProvider
            apiKey={posthogKey ?? ''}
            options={{
              host: 'https://app.posthog.com',
              disabled: !posthogKey || __DEV__,
              // SECURITY: Never capture PII in analytics
              sanitizeProperties: (properties) => {
                const sanitized = { ...properties };
                // Remove any accidental PII fields
                delete sanitized['email'];
                delete sanitized['name'];
                delete sanitized['phone'];
                return sanitized;
              },
            }}
          >
            <View style={styles.root}>
              <StatusBar style="light" backgroundColor={COLORS.bg.primary} />
              <AuthGuard>
                <Slot />
              </AuthGuard>
            </View>
          </PostHogProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
});
