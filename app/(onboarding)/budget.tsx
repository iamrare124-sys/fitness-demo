// app/(onboarding)/budget.tsx — Step 5: Daily diet budget

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import type { DietBudget } from '@types/index';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const OPTIONS: Array<{ id: DietBudget; label: string; desc: string; example: string }> = [
  {
    id: '100-200',
    label: '₹100 – 200',
    desc: 'Budget-friendly',
    example: 'Dal, roti, eggs, sabzi',
  },
  {
    id: '200-400',
    label: '₹200 – 400',
    desc: 'Balanced',
    example: 'Chicken, paneer, oats, fruits',
  },
  {
    id: '400-700',
    label: '₹400 – 700',
    desc: 'Moderate',
    example: 'Salmon, Greek yogurt, quinoa',
  },
  {
    id: '700+',
    label: '₹700+',
    desc: 'Premium',
    example: 'Whey protein, exotic fruits, lean meats',
  },
];

export default function BudgetScreen() {
  const { data, setBudget } = useOnboardingStore();
  const [selected, setSelected] = useState<DietBudget | undefined>(data.diet_budget_inr);

  const handleSelect = async (val: DietBudget) => {
    await Haptics.selectionAsync();
    setSelected(val);
    setBudget(val);
  };

  return (
    <OnboardingStep
      stepNumber={5}
      title="Daily food budget?"
      subtitle="APEX will design meals that maximize nutrition within your budget."
      nextRoute="/(onboarding)/injuries"
      canProceed={!!selected}
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
              <View style={styles.left}>
                <Text style={[styles.amount, isSel && styles.amountSelected]}>{o.label}</Text>
                <Text style={styles.desc}>{o.desc}</Text>
                <Text style={styles.example}>{o.example}</Text>
              </View>
              {isSel && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.note}>
        💡 APEX prioritizes protein per rupee — you'll eat well at any budget.
      </Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING[3] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
  },
  cardSelected: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderColor: COLORS.brand.purple,
  },
  left: { flex: 1 },
  amount: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  amountSelected: { color: COLORS.text.primary },
  desc: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
    marginBottom: 4,
  },
  example: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  note: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING[5],
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
  },
});
