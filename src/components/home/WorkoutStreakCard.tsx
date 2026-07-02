// src/components/home/WorkoutStreakCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, RADIUS } from '@constants/design';

export function WorkoutStreakCard({ streak }: { streak: number }) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={streak >= 7 ? ['#F59E0B', '#D97706'] : ['#1A1A1A', '#111111']}
        style={styles.inner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.flame}>{streak >= 7 ? '🔥' : '⚡'}</Text>
        <Text style={styles.count}>{streak}</Text>
        <Text style={styles.label}>day streak</Text>
        {streak >= 7 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ON FIRE</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  inner: {
    padding: 16,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 160,
  },
  flame: { fontSize: 32, marginBottom: 4 },
  count: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['4xl'],
    color: '#FFFFFF',
    lineHeight: 48,
  },
  label: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 1.5,
  },
});
