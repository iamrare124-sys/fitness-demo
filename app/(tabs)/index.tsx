// app/(tabs)/index.tsx
// Home dashboard: greeting, today's workout, calories ring, streak,
// weekly goal, AI insight card, quick actions.

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@stores/subscriptionStore';
import { supabase } from '@services/supabase';
import { DailyMotivationSplash } from '@components/motivation/DailyMotivationSplash';
import { CaloriesRing } from '@components/home/CaloriesRing';
import { WorkoutStreakCard } from '@components/home/WorkoutStreakCard';
import { TodayWorkoutCard } from '@components/home/TodayWorkoutCard';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@constants/design';

// ─── HELPERS ─────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getShowSplash(): boolean {
  // Show splash once per day — check date stored in memory
  const today = new Date().toDateString();
  const lastShown = (global as Record<string, unknown>).__apexSplashDate as string | undefined;
  if (lastShown !== today) {
    (global as Record<string, unknown>).__apexSplashDate = today;
    return true;
  }
  return false;
}

// ─── TODAY NUTRITION QUERY ────────────────────────────────────
function useTodayNutrition(userId: string | undefined) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['nutrition', 'today', userId, today],
    queryFn: async () => {
      if (!userId) return null;
      const start = `${today}T00:00:00`;
      const end = `${today}T23:59:59`;
      const { data } = await supabase
        .from('nutrition_logs')
        .select('total_calories, total_protein_g, total_carbs_g, total_fat_g, meal_type')
        .eq('user_id', userId)
        .gte('logged_at', start)
        .lte('logged_at', end);
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── WORKOUT SESSIONS QUERY ──────────────────────────────────
function useRecentSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', 'recent', userId],
    queryFn: async () => {
      if (!userId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── COMPONENT ───────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();
  const { subscription, daysLeftInTrial } = useSubscriptionStore();
  const [showSplash, setShowSplash] = useState(getShowSplash);
  const [refreshing, setRefreshing] = useState(false);

  const { data: nutritionLogs, refetch: refetchNutrition } = useTodayNutrition(user?.id);
  const { data: sessions, refetch: refetchSessions } = useRecentSessions(user?.id);

  // Compute totals
  const totalCaloriesToday = nutritionLogs?.reduce((s, l) => s + (l.total_calories ?? 0), 0) ?? 0;
  const calorieTarget = 2000; // TODO: compute from profile (goal + TDEE)

  // Compute streak
  const streakCount = (() => {
    if (!sessions?.length) return 0;
    let streak = 0;
    const dateSet = new Set(
      sessions.map((s) => new Date(s.completed_at).toDateString()),
    );
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      if (dateSet.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  })();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchNutrition(), refetchSessions()]);
    setRefreshing(false);
  }, [refetchNutrition, refetchSessions]);

  const firstName = profile?.name?.split(' ')[0] ?? 'Champion';

  return (
    <>
      {showSplash && (
        <DailyMotivationSplash onDismiss={() => setShowSplash(false)} />
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand.purple}
          />
        }
      >
        {/* Trial banner */}
        {subscription?.status === 'trial' && daysLeftInTrial <= 3 && daysLeftInTrial > 0 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity
              onPress={() => router.push('/(modals)/paywall')}
              style={styles.trialBanner}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.trialGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.trialText}>
                  ⚡ {daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''} left in trial — Upgrade to keep everything
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Greeting */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.nameText}>{firstName} 💪</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(modals)/profile')}
            style={styles.avatarButton}
          >
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? 'A'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Calories ring + streak row */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.statsRow}>
          <CaloriesRing consumed={totalCaloriesToday} target={calorieTarget} />
          <WorkoutStreakCard streak={streakCount} />
        </Animated.View>

        {/* Today's workout card */}
        <Animated.View entering={FadeInUp.duration(500).delay(150)}>
          <TodayWorkoutCard userId={user?.id} />
        </Animated.View>

        {/* AI Insight card */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <AIInsightCard userId={user?.id} sessions={sessions} />
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInUp.duration(500).delay(250)}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              emoji="📷"
              label="Log Meal"
              onPress={() => router.push('/(tabs)/nutrition')}
              color={COLORS.accent.emerald}
            />
            <QuickActionCard
              emoji="💪"
              label="Start Workout"
              onPress={() => router.push('/(tabs)/workout')}
              color={COLORS.brand.purple}
            />
            <QuickActionCard
              emoji="🤖"
              label="Ask Coach"
              onPress={() => router.push('/(tabs)/coach')}
              color={COLORS.accent.sky}
            />
            <QuickActionCard
              emoji="📊"
              label="Log Weight"
              onPress={() => router.push('/(modals)/log-weight')}
              color={COLORS.accent.amber}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────
function AIInsightCard({
  userId,
  sessions,
}: {
  userId?: string;
  sessions?: Array<{ completed_at: string }> | null;
}) {
  // For MVP, show a static smart insight based on recent data
  const sessionCount = sessions?.length ?? 0;
  const weekSessions = sessions?.filter((s) => {
    const d = new Date(s.completed_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d > weekAgo;
  }).length ?? 0;

  const insight = (() => {
    if (sessionCount === 0) return "Start your first workout to get personalized insights! 🚀";
    if (weekSessions >= 4) return "You've hit 4+ workouts this week. You're in the top 15% of APEX users this week. Keep it up! 🔥";
    if (weekSessions >= 2) return `${weekSessions} workouts done this week. Add one more to hit your weekly goal — you're almost there!`;
    return "Log your first meal today so APEX can start tracking your nutrition patterns. 📊";
  })();

  return (
    <View style={insightStyles.card}>
      <View style={insightStyles.header}>
        <Text style={insightStyles.icon}>🤖</Text>
        <Text style={insightStyles.title}>APEX Insight</Text>
      </View>
      <Text style={insightStyles.text}>{insight}</Text>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.brand.purpleMuted,
    marginBottom: SPACING.sectionGap,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  icon: { fontSize: 20 },
  title: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  text: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
});

function QuickActionCard({
  emoji,
  label,
  onPress,
  color,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={qaStyles.card} activeOpacity={0.8}>
      <View style={[qaStyles.iconBg, { backgroundColor: color + '20' }]}>
        <Text style={qaStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    gap: 8,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  label: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  content: { paddingHorizontal: SPACING.screenPadding },
  trialBanner: { marginBottom: SPACING[4], borderRadius: RADIUS.md, overflow: 'hidden' },
  trialGradient: { padding: 10, alignItems: 'center' },
  trialText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#000',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sectionGap,
  },
  greetingText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
  },
  nameText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
  },
  avatarButton: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.lg,
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.itemGap,
    marginBottom: SPACING.sectionGap,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING[3],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.itemGap,
    marginBottom: SPACING.sectionGap,
  },
});
