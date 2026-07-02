// app/(onboarding)/injuries.tsx — Step 6: Injuries / limitations (multi-select)

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import type { InjuryType } from '@types/index';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const OPTIONS: Array<{ id: InjuryType; emoji: string; label: string; note: string }> = [
  { id: 'none', emoji: '✅', label: 'No limitations', note: 'Full range of motion' },
  { id: 'knee', emoji: '🦵', label: 'Knee issues', note: 'Avoid deep squats, heavy lunges' },
  { id: 'back', emoji: '🫀', label: 'Lower back', note: 'Avoid heavy deadlifts, good mornings' },
  { id: 'shoulder', emoji: '💪', label: 'Shoulder', note: 'Avoid overhead pressing behind neck' },
  { id: 'other', emoji: '⚠️', label: 'Other limitation', note: 'Tell your AI coach in chat' },
];

export default function InjuriesScreen() {
  const { data, setInjuries } = useOnboardingStore();
  const [selected, setSelected] = useState<InjuryType[]>(data.injuries ?? []);

  const toggle = async (id: InjuryType) => {
    await Haptics.selectionAsync();
    let next: InjuryType[];

    if (id === 'none') {
      // Selecting "none" clears all others
      next = ['none'];
    } else {
      // Selecting a specific injury removes "none"
      const without = selected.filter((s) => s !== 'none' && s !== id);
      next = selected.includes(id) ? without : [...without, id];
      if (next.length === 0) next = ['none'];
    }

    setSelected(next);
    setInjuries(next);
  };

  return (
    <OnboardingStep
      stepNumber={6}
      title="Any injuries or limitations?"
      subtitle="APEX will automatically modify exercises to keep you safe."
      nextRoute="/(onboarding)/struggle"
      canProceed={selected.length > 0}
    >
      <View style={styles.list}>
        {OPTIONS.map((o) => {
          const isSel = selected.includes(o.id);
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => toggle(o.id)}
              activeOpacity={0.85}
              style={[styles.row, isSel && styles.rowSelected]}
            >
              <Text style={styles.emoji}>{o.emoji}</Text>
              <View style={styles.info}>
                <Text style={[styles.label, isSel && styles.labelSelected]}>{o.label}</Text>
                <Text style={styles.note}>{o.note}</Text>
              </View>
              <View style={[styles.checkbox, isSel && styles.checkboxSelected]}>
                {isSel && <Text style={styles.checkText}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>Select all that apply. You can update this later.</Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    gap: SPACING[3],
  },
  rowSelected: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderColor: COLORS.brand.purple,
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  label: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  labelSelected: { color: COLORS.text.primary },
  note: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.brand.purple,
    borderColor: COLORS.brand.purple,
  },
  checkText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  hint: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING[5],
    textAlign: 'center',
  },
});
