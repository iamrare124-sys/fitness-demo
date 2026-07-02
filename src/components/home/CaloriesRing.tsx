// src/components/home/CaloriesRing.tsx
// Animated circular progress ring showing calories consumed vs target.

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, RADIUS } from '@constants/design';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS_VAL = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_VAL;

interface CaloriesRingProps {
  consumed: number;
  target: number;
}

export function CaloriesRing({ consumed, target }: CaloriesRingProps) {
  const progress = useSharedValue(0);
  const pct = Math.min(consumed / Math.max(target, 1), 1);

  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const color = pct > 1 ? COLORS.accent.crimson : pct > 0.85 ? COLORS.accent.amber : COLORS.accent.emerald;
  const label = pct > 1 ? 'Over goal' : pct > 0.85 ? 'Nearly full' : 'On track';

  return (
    <View style={styles.card}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS_VAL}
            stroke={COLORS.bg.elevated}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          {/* Progress */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS_VAL}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, { color }]}>{consumed}</Text>
          <Text style={styles.ringUnit}>kcal</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>Calories</Text>
      <Text style={styles.cardSub}>
        {target - consumed > 0 ? `${target - consumed} left` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  ringContainer: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    lineHeight: 28,
  },
  ringUnit: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  cardTitle: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
});
