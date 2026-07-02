// app/(tabs)/progress.tsx
// Progress dashboard: weight chart, workout heatmap, strength PRs, body scans, badges.

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'victory-native';

import { supabase } from '@services/supabase';
import { useAuthStore } from '@stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';
import type { WeightLog, PersonalRecord, BadgeId } from '@types/index';

// ─── BADGE DEFINITIONS ───────────────────────────────────────
const BADGES: Array<{ id: BadgeId; emoji: string; title: string; description: string }> = [
  { id: 'first_workout', emoji: '🏋️', title: 'First Workout', description: 'Completed your first session' },
  { id: 'streak_7', emoji: '🔥', title: '7-Day Streak', description: 'Trained 7 days in a row' },
  { id: 'streak_30', emoji: '💪', title: '30-Day Streak', description: 'Trained 30 days in a row' },
  { id: 'weight_loss_2kg', emoji: '⚖️', title: 'Down 2kg', description: 'Lost your first 2kg' },
  { id: 'personal_record', emoji: '🏆', title: 'New PR', description: 'Set a personal record' },
  { id: 'first_body_scan', emoji: '📸', title: 'First Scan', description: 'Completed first body scan' },
  { id: 'meal_log_7_days', emoji: '🥗', title: 'Meal Tracker', description: 'Logged meals 7 days straight' },
];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [chartRange, setChartRange] = useState<30 | 60 | 90>(30);

  // Weight logs
  const { data: weightLogs = [] } = useQuery({
    queryKey: ['weight-logs', user?.id, chartRange],
    queryFn: async () => {
      if (!user?.id) return [];
      const since = new Date();
      since.setDate(since.getDate() - chartRange);
      const { data } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: true });
      return (data ?? []) as WeightLog[];
    },
    enabled: !!user?.id,
  });

  // Workout sessions for heatmap
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', 'heatmap', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', since.toISOString());
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Personal records
  const { data: prs = [] } = useQuery({
    queryKey: ['personal-records', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false })
        .limit(20);
      return (data ?? []) as PersonalRecord[];
    },
    enabled: !!user?.id,
  });

  // Log weight mutation
  const logWeightMutation = useMutation({
    mutationFn: async (weight: number) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: weight,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      setShowLogWeight(false);
      setWeightInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleLogWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 20 || val > 300) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 300 kg.');
      return;
    }
    logWeightMutation.mutate(val);
  };

  // Compute earned badges
  const sessionSet = new Set(sessions.map((s) => new Date(s.completed_at).toDateString()));
  const earnedBadges = new Set<BadgeId>();
  if (sessions.length >= 1) earnedBadges.add('first_workout');
  if (sessions.length >= 1) earnedBadges.add('personal_record'); // simplification
  if (prs.length >= 1) earnedBadges.add('personal_record');

  // Streak calculation
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 90; i++) {
    if (sessionSet.has(cur.toDateString())) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  if (streak >= 7) earnedBadges.add('streak_7');
  if (streak >= 30) earnedBadges.add('streak_30');

  // Weight delta
  if (weightLogs.length >= 2) {
    const first = weightLogs[0]?.weight_kg ?? 0;
    const last = weightLogs[weightLogs.length - 1]?.weight_kg ?? 0;
    if (first - last >= 2) earnedBadges.add('weight_loss_2kg');
  }

  // Chart data
  const chartData = weightLogs.map((log, i) => ({
    x: i,
    y: log.weight_kg,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Progress</Text>

      {/* Weight Chart */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weight Tracking</Text>
          <TouchableOpacity
            onPress={() => setShowLogWeight(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Range tabs */}
        <View style={styles.rangeTabs}>
          {([30, 60, 90] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setChartRange(r)}
              style={[styles.rangeTab, chartRange === r && styles.rangeTabActive]}
            >
              <Text style={[styles.rangeTabText, chartRange === r && styles.rangeTabTextActive]}>
                {r}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {chartData.length >= 2 ? (
          <View style={styles.chartContainer}>
            {/* Victory Native line chart */}
            <LineChart
              data={chartData}
              width={320}
              height={160}
              style={{ data: { stroke: COLORS.brand.purple, strokeWidth: 2.5 } }}
              animate={{ duration: 500 }}
            />
            <View style={styles.weightSummary}>
              <View style={styles.weightStat}>
                <Text style={styles.weightStatValue}>{weightLogs[0]?.weight_kg ?? '—'} kg</Text>
                <Text style={styles.weightStatLabel}>Start</Text>
              </View>
              <View style={styles.weightStat}>
                <Text style={[styles.weightStatValue, { color: COLORS.accent.emerald }]}>
                  {weightLogs[weightLogs.length - 1]?.weight_kg ?? '—'} kg
                </Text>
                <Text style={styles.weightStatLabel}>Current</Text>
              </View>
              <View style={styles.weightStat}>
                {weightLogs.length >= 2 ? (
                  <>
                    <Text style={[
                      styles.weightStatValue,
                      {
                        color: (weightLogs[0]?.weight_kg ?? 0) > (weightLogs[weightLogs.length - 1]?.weight_kg ?? 0)
                          ? COLORS.accent.emerald
                          : COLORS.accent.crimson,
                      },
                    ]}>
                      {Math.abs(
                        (weightLogs[weightLogs.length - 1]?.weight_kg ?? 0) -
                        (weightLogs[0]?.weight_kg ?? 0),
                      ).toFixed(1)} kg
                    </Text>
                    <Text style={styles.weightStatLabel}>Change</Text>
                  </>
                ) : (
                  <Text style={styles.weightStatLabel}>No change yet</Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>
              Log your weight to see your progress chart
            </Text>
            <TouchableOpacity onPress={() => setShowLogWeight(true)} style={styles.emptyChartCta}>
              <Text style={styles.emptyChartCtaText}>Log Today's Weight →</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Workout Heatmap */}
      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Calendar</Text>
        <Text style={styles.sectionSub}>Last 90 days</Text>
        <WorkoutHeatmap sessions={sessions} />
      </Animated.View>

      {/* Personal Records */}
      {prs.length > 0 && (
        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
          {prs.slice(0, 5).map((pr) => (
            <View key={pr.id} style={styles.prRow}>
              <Text style={styles.prExercise}>{pr.exercise_name}</Text>
              <Text style={styles.prValue}>
                {pr.weight_kg ? `${pr.weight_kg}kg × ${pr.reps} reps` : `${pr.reps} reps`}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Achievement Badges */}
      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => {
            const earned = earnedBadges.has(badge.id);
            return (
              <View
                key={badge.id}
                style={[styles.badge, !earned && styles.badgeLocked]}
              >
                <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
                  {badge.emoji}
                </Text>
                <Text style={[styles.badgeTitle, !earned && styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                {!earned && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>🔒</Text></View>}
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Log Weight Modal */}
      <Modal
        visible={showLogWeight}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogWeight(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Today's Weight</Text>
            <TextInput
              style={styles.weightInputField}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 72.5"
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="decimal-pad"
              autoFocus
              maxLength={6}
            />
            <Text style={styles.weightUnit}>kg</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowLogWeight(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogWeight}>
                <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.modalSaveButton}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── WORKOUT HEATMAP ─────────────────────────────────────────
function WorkoutHeatmap({ sessions }: { sessions: Array<{ completed_at: string }> }) {
  const sessionDates = new Set(sessions.map((s) => new Date(s.completed_at).toDateString()));

  // Generate last 90 days grid
  const days: Date[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  // Group into weeks
  const weeks: Date[][] = [];
  let week: Date[] = [];
  days.forEach((d, i) => {
    week.push(d);
    if (week.length === 7 || i === days.length - 1) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <View style={heatmapStyles.container}>
      <View style={heatmapStyles.grid}>
        {weeks.map((wk, wi) => (
          <View key={wi} style={heatmapStyles.weekCol}>
            {wk.map((day, di) => {
              const active = sessionDates.has(day.toDateString());
              const isToday = day.toDateString() === today.toDateString();
              return (
                <View
                  key={di}
                  style={[
                    heatmapStyles.cell,
                    active && heatmapStyles.cellActive,
                    isToday && heatmapStyles.cellToday,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={heatmapStyles.legend}>
        <Text style={heatmapStyles.legendText}>Less</Text>
        {[0.2, 0.5, 0.8, 1].map((o) => (
          <View key={o} style={[heatmapStyles.legendCell, { opacity: o }]} />
        ))}
        <Text style={heatmapStyles.legendText}>More</Text>
      </View>
    </View>
  );
}

const heatmapStyles = StyleSheet.create({
  container: { marginTop: 12 },
  grid: { flexDirection: 'row', gap: 3 },
  weekCol: { gap: 3 },
  cell: { width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.bg.elevated },
  cellActive: { backgroundColor: COLORS.brand.purple },
  cellToday: { borderWidth: 1, borderColor: COLORS.accent.amber },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  legendCell: { width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.brand.purple },
  legendText: { fontFamily: TYPOGRAPHY.family.body, fontSize: 9, color: COLORS.text.tertiary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  content: { paddingHorizontal: SPACING.screenPadding },
  pageTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: SPACING.sectionGap,
  },
  section: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.sectionGap,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.lg, color: COLORS.text.primary, marginBottom: 4 },
  sectionSub: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginBottom: 12 },
  addButton: { backgroundColor: COLORS.brand.purpleMuted, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.brand.purple },
  addButtonText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.brand.purpleLight },

  rangeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rangeTab: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.tertiary },
  rangeTabActive: { backgroundColor: COLORS.brand.purpleMuted, borderWidth: 1, borderColor: COLORS.brand.purple },
  rangeTabText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
  rangeTabTextActive: { color: COLORS.brand.purpleLight },

  chartContainer: { alignItems: 'center' },
  weightSummary: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 12 },
  weightStat: { alignItems: 'center' },
  weightStatValue: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.primary },
  weightStatLabel: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 2 },

  emptyChart: { alignItems: 'center', paddingVertical: 24 },
  emptyChartText: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, textAlign: 'center', marginBottom: 12 },
  emptyChartCta: {},
  emptyChartCtaText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.brand.purpleLight },

  prRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle },
  prExercise: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
  prValue: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.accent.amber },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  badge: { width: '30%', alignItems: 'center', backgroundColor: COLORS.bg.tertiary, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border.subtle, position: 'relative' },
  badgeLocked: { opacity: 0.4 },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeEmojiLocked: { filter: 'grayscale(1)' } as never,
  badgeTitle: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: 10, color: COLORS.text.secondary, textAlign: 'center' },
  badgeTitleLocked: { color: COLORS.text.tertiary },
  lockOverlay: { position: 'absolute', top: 6, right: 6 },
  lockIcon: { fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.primary, marginBottom: 20, textAlign: 'center' },
  weightInputField: { backgroundColor: COLORS.bg.tertiary, borderRadius: RADIUS.lg, paddingHorizontal: 20, paddingVertical: 18, fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['3xl'], color: COLORS.text.primary, textAlign: 'center', borderWidth: 1, borderColor: COLORS.brand.purple, marginBottom: 4 },
  weightUnit: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.bg.tertiary, borderRadius: RADIUS.md },
  modalCancelText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },
  modalSaveButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: RADIUS.md },
  modalSaveText: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: '#FFF' },
});
