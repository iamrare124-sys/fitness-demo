// app/(onboarding)/struggle.tsx — Step 7: Biggest fitness struggle + submit

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import { useAuthStore } from '@stores/authStore';
import type { BiggestStruggle } from '@types/index';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const OPTIONS: Array<{ id: BiggestStruggle; emoji: string; label: string; relatable: string }> = [
  {
    id: 'consistency',
    emoji: '📅',
    label: "Staying consistent",
    relatable: '"I start strong then fall off after 2 weeks"',
  },
  {
    id: 'dont_know_what_to_do',
    emoji: '🤷',
    label: "Not knowing what to do",
    relatable: '"I go to the gym but have no real plan"',
  },
  {
    id: 'nutrition_confusion',
    emoji: '🍽️',
    label: "Nutrition confusion",
    relatable: '"I don\'t know what to eat or how much"',
  },
  {
    id: 'no_results',
    emoji: '📉',
    label: "Not seeing results",
    relatable: '"I work hard but nothing changes"',
  },
];

export default function StruggleScreen() {
  const router = useRouter();
  const { data, setBiggestStruggle, submitOnboarding } = useOnboardingStore();
  const { user, refreshProfile } = useAuthStore();
  const [selected, setSelected] = useState<BiggestStruggle | undefined>(data.biggest_struggle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (val: BiggestStruggle) => {
    await Haptics.selectionAsync();
    setSelected(val);
    setBiggestStruggle(val);
  };

  const handleComplete = async (): Promise<boolean> => {
    if (!selected || !user?.id) return false;
    setIsSubmitting(true);

    const { error } = await submitOnboarding(user.id);
    if (error) {
      setIsSubmitting(false);
      return false;
    }

    await refreshProfile();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // AuthGuard in _layout.tsx will redirect to (tabs) once profile.onboarding_complete = true
    setIsSubmitting(false);
    return true;
  };

  return (
    <OnboardingStep
      stepNumber={7}
      title="What's your biggest struggle?"
      subtitle="Be honest — APEX's AI is specifically designed to tackle this for you."
      nextLabel="Build My Plan →"
      canProceed={!!selected}
      isLoading={isSubmitting}
      onNext={handleComplete}
    >
      <View style={styles.list}>
        {OPTIONS.map((o) => {
          const isSel = selected === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => handleSelect(o.id)}
              activeOpacity={0.85}
              style={[styles.card, isSel && styles.cardSelected]}
            >
              {isSel && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
              <Text style={styles.emoji}>{o.emoji}</Text>
              <Text style={[styles.label, isSel && styles.labelSelected]}>{o.label}</Text>
              <Text style={styles.relatable}>{o.relatable}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.promiseBadge}>
        <Text style={styles.promiseText}>
          🎯 APEX will personalize everything — workouts, meals, coaching — specifically around your struggle.
        </Text>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING[3] },
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderColor: COLORS.brand.purple,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emoji: { fontSize: 28, marginBottom: 8 },
  label: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  labelSelected: { color: COLORS.text.primary },
  relatable: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  promiseBadge: {
    backgroundColor: COLORS.accent.emeraldGlow,
    borderWidth: 1,
    borderColor: COLORS.accent.emerald,
    borderRadius: RADIUS.lg,
    padding: SPACING.cardPadding,
    marginTop: SPACING[5],
  },
  promiseText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accent.emerald,
    lineHeight: 20,
  },
});
