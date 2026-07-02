// app/(onboarding)/workout-time.tsx — Step 2: Daily workout time

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const OPTIONS = [
  { value: 15 as const, label: '15 min', desc: 'Quick & efficient' },
  { value: 30 as const, label: '30 min', desc: 'Balanced sessions' },
  { value: 45 as const, label: '45 min', desc: 'Thorough training' },
  { value: 60 as const, label: '60+ min', desc: 'Maximum results' },
];

export default function WorkoutTimeScreen() {
  const { data, setWorkoutTime } = useOnboardingStore();
  const [selected, setSelected] = useState(data.workout_time_minutes);

  const handleSelect = async (val: 15 | 30 | 45 | 60) => {
    await Haptics.selectionAsync();
    setSelected(val);
    setWorkoutTime(val);
  };

  return (
    <OnboardingStep
      stepNumber={2}
      title="How long can you train daily?"
      subtitle="Be honest — shorter consistent sessions beat longer ones you skip."
      nextRoute="/(onboarding)/workout-days"
      canProceed={!!selected}
    >
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const isSel = selected === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => handleSelect(o.value)}
              activeOpacity={0.85}
              style={[styles.card, isSel && styles.cardSelected]}
            >
              <Text style={[styles.timeLabel, isSel && styles.timeLabelSelected]}>
                {o.label}
              </Text>
              <Text style={styles.timeDesc}>{o.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.itemGap,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
  },
  cardSelected: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderColor: COLORS.brand.purple,
  },
  timeLabel: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  timeLabelSelected: {
    color: COLORS.brand.purpleLight,
  },
  timeDesc: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
