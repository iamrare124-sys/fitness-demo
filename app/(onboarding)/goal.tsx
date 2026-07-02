// app/(onboarding)/goal.tsx
// Step 1: Fitness goal selection with icons and descriptions
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import type { FitnessGoal } from '@types/index';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const GOALS: Array<{
  id: FitnessGoal;
  emoji: string;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: 'weight_loss',
    emoji: '🔥',
    title: 'Lose Weight',
    description: 'Burn fat, improve health, feel lighter and more energetic',
    color: '#EF4444',
  },
  {
    id: 'muscle_gain',
    emoji: '💪',
    title: 'Build Muscle',
    description: 'Add strength and size, sculpt a powerful physique',
    color: '#7C3AED',
  },
  {
    id: 'general_fitness',
    emoji: '⚡',
    title: 'Get Fit',
    description: 'Improve overall fitness, endurance, and health markers',
    color: '#F59E0B',
  },
  {
    id: 'maintenance',
    emoji: '🎯',
    title: 'Stay Consistent',
    description: 'Maintain current physique with healthy, sustainable habits',
    color: '#10B981',
  },
];

export default function GoalScreen() {
  const { data, setGoal } = useOnboardingStore();
  const [selected, setSelected] = useState<FitnessGoal | undefined>(data.goal);

  const handleSelect = async (goal: FitnessGoal) => {
    await Haptics.selectionAsync();
    setSelected(goal);
    setGoal(goal);
  };

  return (
    <OnboardingStep
      stepNumber={1}
      title="What's your main goal?"
      subtitle="This powers every AI-generated plan and recommendation in APEX."
      nextRoute="/(onboarding)/workout-time"
      canProceed={!!selected}
    >
      <View style={styles.grid}>
        {GOALS.map((goal) => {
          const isSelected = selected === goal.id;
          return (
            <TouchableOpacity
              key={goal.id}
              onPress={() => handleSelect(goal.id)}
              activeOpacity={0.85}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                isSelected && { borderColor: goal.color },
              ]}
            >
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: goal.color }]}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
              <Text style={styles.emoji}>{goal.emoji}</Text>
              <Text style={[styles.goalTitle, isSelected && { color: goal.color }]}>
                {goal.title}
              </Text>
              <Text style={styles.goalDesc}>{goal.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: SPACING.itemGap,
  },
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding + 4,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: COLORS.bg.tertiary,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  goalTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  goalDesc: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});
