// app/(onboarding)/workout-days.tsx — Step 3: Days per week

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const DAYS = [2, 3, 4, 5, 6] as const;
const DAY_LABELS: Record<number, string> = {
  2: 'Starter', 3: 'Balanced', 4: 'Dedicated', 5: 'Committed', 6: 'Elite',
};

export default function WorkoutDaysScreen() {
  const { data, setWorkoutDays } = useOnboardingStore();
  const [selected, setSelected] = useState(data.workout_days_per_week);

  const handleSelect = async (val: typeof DAYS[number]) => {
    await Haptics.selectionAsync();
    setSelected(val);
    setWorkoutDays(val);
  };

  return (
    <OnboardingStep
      stepNumber={3}
      title="How many days per week?"
      subtitle="Your workout plan will be structured around these days."
      nextRoute="/(onboarding)/equipment"
      canProceed={!!selected}
    >
      <View style={styles.container}>
        {DAYS.map((d) => {
          const isSel = selected === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => handleSelect(d)}
              activeOpacity={0.85}
              style={[styles.row, isSel && styles.rowSelected]}
            >
              <View style={[styles.badge, isSel && styles.badgeSelected]}>
                <Text style={[styles.badgeText, isSel && styles.badgeTextSelected]}>
                  {d}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.dayText, isSel && styles.dayTextSelected]}>
                  {d} days / week
                </Text>
                <Text style={styles.levelText}>{DAY_LABELS[d]}</Text>
              </View>
              {isSel && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    gap: SPACING[4],
  },
  rowSelected: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderColor: COLORS.brand.purple,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: { backgroundColor: COLORS.brand.purple },
  badgeText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.text.secondary,
  },
  badgeTextSelected: { color: '#FFFFFF' },
  info: { flex: 1 },
  dayText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  dayTextSelected: { color: COLORS.text.primary },
  levelText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
  check: {
    color: COLORS.brand.purpleLight,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
