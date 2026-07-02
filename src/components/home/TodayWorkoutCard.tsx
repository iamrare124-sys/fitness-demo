// src/components/home/TodayWorkoutCard.tsx
// Shows next scheduled workout or prompt to generate plan.

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@services/supabase';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

export function TodayWorkoutCard({ userId }: { userId?: string }) {
  const router = useRouter();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['workout-plan', 'active', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.brand.purple} />
      </View>
    );
  }

  if (!plan) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/workout')}
        style={styles.card}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.brand.purpleMuted, 'transparent']}
          style={styles.emptyInner}
        >
          <Text style={styles.emptyEmoji}>💪</Text>
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle}>No workout plan yet</Text>
            <Text style={styles.emptySub}>Tap to generate your AI-powered 4-week plan</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Get today's workout from plan_json
  const planJson = plan.plan_json as { weeks?: Array<{ days?: Array<{ day_name: string; estimated_duration_minutes: number; muscle_focus: string[] }> }> } | null;
  const today = new Date().getDay(); // 0=Sun
  const dayIndex = today === 0 ? 6 : today - 1; // Mon=0
  const currentWeek = planJson?.weeks?.[0];
  const todayWorkout = currentWeek?.days?.[dayIndex % (currentWeek?.days?.length ?? 1)];

  if (!todayWorkout) {
    return (
      <View style={[styles.card, styles.restDay]}>
        <Text style={styles.restEmoji}>😴</Text>
        <View>
          <Text style={styles.restTitle}>Rest Day</Text>
          <Text style={styles.restSub}>Recovery is when muscles actually grow. Rest well.</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/workout')}
      style={styles.card}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.todayLabel}>TODAY'S WORKOUT</Text>
          <Text style={styles.workoutName}>{todayWorkout.day_name}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{todayWorkout.estimated_duration_minutes}min</Text>
        </View>
      </View>
      <View style={styles.muscles}>
        {(todayWorkout.muscle_focus ?? []).slice(0, 3).map((m) => (
          <View key={m} style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{m}</Text>
          </View>
        ))}
      </View>
      <View style={styles.startRow}>
        <LinearGradient
          colors={['#7C3AED', '#5B21B6']}
          style={styles.startButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.startText}>Start Workout →</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.sectionGap,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    minHeight: 80,
    justifyContent: 'center',
  },
  emptyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.lg,
    padding: 4,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { flex: 1 },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  emptySub: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  arrow: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.brand.purpleLight,
  },
  restDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: SPACING.sectionGap,
  },
  restEmoji: { fontSize: 36 },
  restTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  restSub: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  todayLabel: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.brand.purpleLight,
    letterSpacing: TYPOGRAPHY.tracking.wider,
    marginBottom: 4,
  },
  workoutName: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.text.primary,
  },
  durationBadge: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  durationText: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  muscles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  muscleTag: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderWidth: 1,
    borderColor: COLORS.brand.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  muscleTagText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.brand.purpleLight,
    textTransform: 'capitalize',
  },
  startRow: {},
  startButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: '#FFFFFF',
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
});
