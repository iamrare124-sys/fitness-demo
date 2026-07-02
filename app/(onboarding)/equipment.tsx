// app/(onboarding)/equipment.tsx — Step 4: Equipment access

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OnboardingStep } from '@components/onboarding/OnboardingStep';
import { useOnboardingStore } from '@stores/onboardingStore';
import type { EquipmentType } from '@types/index';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const OPTIONS: Array<{ id: EquipmentType; emoji: string; title: string; desc: string }> = [
  { id: 'full_gym', emoji: '🏋️', title: 'Full Gym', desc: 'Barbells, machines, cables, dumbbells' },
  { id: 'home_basic', emoji: '🏠', title: 'Home Basics', desc: 'Dumbbells, resistance bands, mat' },
  { id: 'no_equipment', emoji: '🤸', title: 'No Equipment', desc: 'Bodyweight only, anywhere' },
  { id: 'mix', emoji: '⚙️', title: 'Mixed', desc: 'Sometimes gym, sometimes home' },
];

export default function EquipmentScreen() {
  const { data, setEquipment } = useOnboardingStore();
  const [selected, setSelected] = useState<EquipmentType | undefined>(data.equipment);

  const handleSelect = async (val: EquipmentType) => {
    await Haptics.selectionAsync();
    setSelected(val);
    setEquipment(val);
  };

  return (
    <OnboardingStep
      stepNumber={4}
      title="What equipment do you have?"
      subtitle="Your workouts will be tailored to what's actually available to you."
      nextRoute="/(onboarding)/budget"
      canProceed={!!selected}
    >
      <View style={styles.grid}>
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
              <Text style={[styles.title, isSel && styles.titleSelected]}>{o.title}</Text>
              <Text style={styles.desc}>{o.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.itemGap },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
    borderWidth: 2,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
    position: 'relative',
  },
  cardSelected: { backgroundColor: COLORS.brand.purpleMuted, borderColor: COLORS.brand.purple },
  checkBadge: {
    position: 'absolute', top: 8, right: 8, width: 22, height: 22,
    borderRadius: 11, backgroundColor: COLORS.brand.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  emoji: { fontSize: 32, marginBottom: 8 },
  title: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  titleSelected: { color: COLORS.text.primary },
  desc: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
