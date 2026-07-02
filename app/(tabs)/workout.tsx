// app/(tabs)/workout.tsx
// Workout plan viewer, exercise cards, set logging, rest timer.

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { supabase } from '@services/supabase';
import { useAuthStore } from '@stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';
import type { WorkoutPlan, WorkoutDay, WorkoutExercise, WorkoutWeek } from '@types/index';

// ─── REST TIMER HOOK ──────────────────────────────────────────
function useRestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = (duration: number) => {
    setSeconds(duration);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          Vibration.vibrate([0, 300, 100, 300]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSeconds(0);
  };

  return { seconds, isRunning, start, stop };
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const restTimer = useRestTimer();
  const [activeDay, setActiveDay] = useState<WorkoutDay | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Fetch active workout plan
  const { data: plan, isLoading } = useQuery({
    queryKey: ['workout-plan', 'active', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    },
    enabled: !!user?.id,
  });

  const planJson = plan?.plan_json as { weeks?: WorkoutWeek[] } | null;
  const weeks = planJson?.weeks ?? [];

  // Generate new workout plan
  const handleGeneratePlan = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-workout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Generation failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['workout-plan'] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Plan Ready! 💪', 'Your personalized 4-week workout plan is ready.');
    } catch (error) {
      Alert.alert('Error', 'Could not generate workout plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Log set completion
  const handleSetComplete = (exerciseId: string, totalSets: number, restSeconds: number) => {
    const key = exerciseId;
    const current = completedSets[key] ?? 0;
    if (current >= totalSets) return;

    const next = current + 1;
    setCompletedSets((prev) => ({ ...prev, [key]: next }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Start rest timer after completing a set (not after last set)
    if (next < totalSets) {
      restTimer.start(restSeconds);
    }
  };

  // Complete workout session
  const handleCompleteWorkout = async () => {
    if (!user?.id || !activeDay) return;
    const durationMinutes = Math.round((Date.now() - sessionStartTime) / 60000);

    await supabase.from('workout_sessions').insert({
      user_id: user.id,
      plan_id: plan?.id ?? null,
      day_name: activeDay.day_name,
      exercises_completed: activeDay.exercises as unknown as Record<string, unknown>[],
      duration_minutes: durationMinutes,
      calories_burned: Math.round(durationMinutes * 7), // rough estimate
    });

    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    setActiveDay(null);
    setCompletedSets({});
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Workout Complete! 🎉', `Excellent work! You trained for ${durationMinutes} minutes.`);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand.purple} size="large" />
      </View>
    );
  }

  // Active workout view
  if (activeDay) {
    return (
      <ActiveWorkoutView
        day={activeDay}
        completedSets={completedSets}
        restTimer={restTimer}
        onSetComplete={handleSetComplete}
        onComplete={handleCompleteWorkout}
        onBack={() => setActiveDay(null)}
        insets={insets}
      />
    );
  }

  // No plan yet
  if (!plan || weeks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>🏋️</Text>
          <Text style={styles.emptyTitle}>No Workout Plan Yet</Text>
          <Text style={styles.emptySubtitle}>
            APEX will generate a personalized 4-week progressive plan based on your goals and equipment.
          </Text>
          <TouchableOpacity onPress={handleGeneratePlan} disabled={isGenerating}>
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.generateButton}>
              {isGenerating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.generateText}>Generating your plan...</Text>
                </View>
              ) : (
                <Text style={styles.generateText}>⚡ Generate My Plan</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {isGenerating && (
            <Text style={styles.generatingHint}>
              This takes ~30 seconds. GPT-4o is designing your personalized program...
            </Text>
          )}
        </Animated.View>
      </View>
    );
  }

  // Plan overview
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Plan</Text>
        <TouchableOpacity
          onPress={() => Alert.alert(
            'Regenerate Plan?',
            'This will replace your current plan with a new AI-generated one.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Regenerate', onPress: handleGeneratePlan },
            ],
          )}
          style={styles.regenerateButton}
        >
          <Text style={styles.regenerateText}>↻ New Plan</Text>
        </TouchableOpacity>
      </View>

      {weeks.map((week) => (
        <Animated.View
          key={week.week_number}
          entering={FadeInUp.duration(400).delay(week.week_number * 100)}
          style={styles.weekSection}
        >
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>Week {week.week_number}</Text>
            <View style={[
              styles.weekThemeBadge,
              week.theme === 'Deload' && styles.deloadBadge,
            ]}>
              <Text style={styles.weekThemeText}>{week.theme}</Text>
            </View>
          </View>

          {(week.days ?? []).map((day) => (
            <TouchableOpacity
              key={day.day_number}
              onPress={() => {
                setActiveDay(day);
                setCompletedSets({});
              }}
              style={styles.dayCard}
              activeOpacity={0.85}
            >
              <View style={styles.dayLeft}>
                <Text style={styles.dayName}>{day.day_name}</Text>
                <View style={styles.muscleTags}>
                  {day.muscle_focus.slice(0, 2).map((m) => (
                    <View key={m} style={styles.muscleTag}>
                      <Text style={styles.muscleTagText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.dayRight}>
                <Text style={styles.dayDuration}>{day.estimated_duration_minutes}min</Text>
                <Text style={styles.dayExCount}>{day.exercises.length} exercises</Text>
              </View>
              <Text style={styles.dayArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      ))}
    </ScrollView>
  );
}

// ─── ACTIVE WORKOUT VIEW ──────────────────────────────────────
function ActiveWorkoutView({
  day,
  completedSets,
  restTimer,
  onSetComplete,
  onComplete,
  onBack,
  insets,
}: {
  day: WorkoutDay;
  completedSets: Record<string, number>;
  restTimer: ReturnType<typeof useRestTimer>;
  onSetComplete: (id: string, total: number, rest: number) => void;
  onComplete: () => void;
  onBack: () => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const allDone = day.exercises.every((ex) => (completedSets[ex.exercise_id] ?? 0) >= ex.sets);

  return (
    <View style={styles.activeContainer}>
      {/* Rest timer overlay */}
      {restTimer.isRunning && (
        <View style={styles.restOverlay}>
          <Text style={styles.restLabel}>Rest</Text>
          <Text style={styles.restSeconds}>{restTimer.seconds}s</Text>
          <TouchableOpacity onPress={restTimer.stop} style={styles.skipRestButton}>
            <Text style={styles.skipRestText}>Skip →</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.activeContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Back + header */}
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Plan</Text>
        </TouchableOpacity>
        <Text style={styles.activeDayName}>{day.day_name}</Text>
        <Text style={styles.activeDayMeta}>
          {day.exercises.length} exercises • ~{day.estimated_duration_minutes} min
        </Text>

        {/* Exercises */}
        {day.exercises.map((ex, idx) => {
          const done = completedSets[ex.exercise_id] ?? 0;
          const isComplete = done >= ex.sets;

          return (
            <Animated.View
              key={ex.exercise_id}
              entering={FadeInDown.duration(300).delay(idx * 60)}
              style={[styles.exerciseCard, isComplete && styles.exerciseCardDone]}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, isComplete && styles.exerciseNameDone]}>
                    {isComplete && '✓ '}{ex.exercise_name}
                  </Text>
                  <View style={[styles.muscleTag, { alignSelf: 'flex-start' }]}>
                    <Text style={styles.muscleTagText}>{ex.muscle_group}</Text>
                  </View>
                </View>
                <View style={styles.exerciseMeta}>
                  <Text style={styles.exerciseMetaText}>{ex.sets} × {ex.reps}</Text>
                  <Text style={styles.exerciseRestText}>{ex.rest_seconds}s rest</Text>
                </View>
              </View>

              {ex.notes ? (
                <Text style={styles.exerciseNotes}>💡 {ex.notes}</Text>
              ) : null}

              {/* Set dots */}
              <View style={styles.setRow}>
                {Array.from({ length: ex.sets }).map((_, setIdx) => (
                  <TouchableOpacity
                    key={setIdx}
                    onPress={() => !isComplete && onSetComplete(ex.exercise_id, ex.sets, ex.rest_seconds)}
                    style={[
                      styles.setDot,
                      setIdx < done && styles.setDotDone,
                    ]}
                  >
                    <Text style={[styles.setDotText, setIdx < done && styles.setDotTextDone]}>
                      {setIdx < done ? '✓' : setIdx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.setProgress}>{done}/{ex.sets} sets</Text>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Complete button */}
      {allDone && (
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={[styles.completeButtonContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          <TouchableOpacity onPress={onComplete}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>🎉 Complete Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  content: { paddingHorizontal: SPACING.screenPadding },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg.primary },

  // Empty state
  emptyContainer: { flex: 1, backgroundColor: COLORS.bg.primary, justifyContent: 'center', alignItems: 'center', padding: SPACING.screenPadding },
  emptyContent: { alignItems: 'center', maxWidth: 340 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, marginBottom: 12, textAlign: 'center' },
  emptySubtitle: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  generateButton: { borderRadius: RADIUS.lg, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateText: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.lg, color: '#FFF' },
  generatingHint: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, textAlign: 'center', marginTop: 16, lineHeight: 20 },

  // Plan overview
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sectionGap },
  title: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary },
  regenerateButton: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border.default },
  regenerateText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },

  weekSection: { marginBottom: SPACING.sectionGap },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  weekTitle: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.lg, color: COLORS.text.primary },
  weekThemeBadge: { backgroundColor: COLORS.brand.purpleMuted, borderWidth: 1, borderColor: COLORS.brand.purple, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },
  deloadBadge: { backgroundColor: COLORS.accent.amberGlow, borderColor: COLORS.accent.amber },
  weekThemeText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.xs, color: COLORS.brand.purpleLight },

  dayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.cardPadding, marginBottom: SPACING[3], borderWidth: 1, borderColor: COLORS.border.subtle },
  dayLeft: { flex: 1 },
  dayName: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 6 },
  muscleTags: { flexDirection: 'row', gap: 6 },
  muscleTag: { backgroundColor: COLORS.brand.purpleMuted, borderWidth: 1, borderColor: COLORS.brand.purple, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  muscleTagText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: 10, color: COLORS.brand.purpleLight, textTransform: 'capitalize' },
  dayRight: { alignItems: 'flex-end', marginRight: 8 },
  dayDuration: { fontFamily: TYPOGRAPHY.family.bodySemiBold, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
  dayExCount: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
  dayArrow: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.tertiary },

  // Active workout
  activeContainer: { flex: 1, backgroundColor: COLORS.bg.primary },
  activeContent: { paddingHorizontal: SPACING.screenPadding },
  backButton: { marginBottom: 16 },
  backText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.brand.purpleLight },
  activeDayName: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, marginBottom: 4 },
  activeDayMeta: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginBottom: SPACING.sectionGap },

  exerciseCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.xl, padding: SPACING.cardPadding, marginBottom: SPACING[3], borderWidth: 1, borderColor: COLORS.border.subtle },
  exerciseCardDone: { borderColor: COLORS.accent.emerald, backgroundColor: COLORS.accent.emeraldGlow },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exerciseInfo: { flex: 1, gap: 6 },
  exerciseName: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
  exerciseNameDone: { color: COLORS.accent.emerald },
  exerciseMeta: { alignItems: 'flex-end' },
  exerciseMetaText: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.lg, color: COLORS.text.primary },
  exerciseRestText: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
  exerciseNotes: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, marginBottom: 10, lineHeight: 20 },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  setDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bg.tertiary, borderWidth: 2, borderColor: COLORS.border.default, alignItems: 'center', justifyContent: 'center' },
  setDotDone: { backgroundColor: COLORS.brand.purple, borderColor: COLORS.brand.purple },
  setDotText: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
  setDotTextDone: { color: '#FFF' },
  setProgress: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginLeft: 4 },

  restOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.92)', zIndex: 50, alignItems: 'center', justifyContent: 'center' },
  restLabel: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.tertiary, marginBottom: 8 },
  restSeconds: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['5xl'], color: COLORS.brand.purpleLight, marginBottom: 32 },
  skipRestButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border.default },
  skipRestText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

  completeButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.screenPadding, paddingTop: 12, backgroundColor: COLORS.bg.primary, borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  completeButton: { borderRadius: RADIUS.lg, paddingVertical: 18, alignItems: 'center' },
  completeButtonText: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.lg, color: '#FFF' },
});
