// src/components/onboarding/OnboardingStep.tsx
// Reusable wrapper for all 7 onboarding screens.
// Provides consistent layout, back/next navigation, and animations.

import { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '@stores/onboardingStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

interface OnboardingStepProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  nextRoute?: string;
  onNext?: () => Promise<boolean> | boolean; // return false to block navigation
  nextLabel?: string;
  isLoading?: boolean;
  canProceed?: boolean;
}

export function OnboardingStep({
  stepNumber,
  title,
  subtitle,
  children,
  nextRoute,
  onNext,
  nextLabel = 'Continue',
  isLoading = false,
  canProceed = true,
}: OnboardingStepProps) {
  const router = useRouter();
  const { totalSteps, prevStep, nextStep } = useOnboardingStore();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const handleNext = async () => {
    if (!canProceed || isLoading) return;
    if (onNext) {
      const proceed = await onNext();
      if (!proceed) return;
    }
    nextStep();
    if (nextRoute) {
      router.push(nextRoute as never);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.topRow}>
          {stepNumber > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={styles.stepCounter}>
            {stepNumber}/{totalSteps}
          </Text>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>

        {/* Content */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          {children}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(200)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed || isLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              !canProceed
                ? ['#374151', '#1F2937']
                : ['#7C3AED', '#5B21B6']
            }
            style={styles.nextButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.nextText, !canProceed && styles.nextTextDisabled]}>
                {nextLabel}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.brand.purpleLight,
  },
  backPlaceholder: {
    width: 60,
  },
  stepCounter: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['3xl'],
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 12,
    backgroundColor: COLORS.bg.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  nextButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  nextTextDisabled: {
    color: COLORS.text.tertiary,
  },
});
