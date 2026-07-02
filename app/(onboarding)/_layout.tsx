// app/(onboarding)/_layout.tsx
// Onboarding layout with animated progress indicator across all 7 steps.
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useOnboardingStore } from '@stores/onboardingStore';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '@constants/design';

function ProgressBar() {
  const { currentStep, totalSteps } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const progress = currentStep / totalSteps;

  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${progress * 100}%` as unknown as number, {
      damping: 20,
      stiffness: 120,
    }),
  }));

  return (
    <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>
    </View>
  );
}

export default function OnboardingLayout() {
  return (
    <View style={styles.container}>
      <ProgressBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg.primary },
          animation: 'slide_from_right',
          gestureEnabled: false, // Prevent back swipe on onboarding
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.bg.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.bg.elevated,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brand.purple,
    borderRadius: RADIUS.full,
  },
});
