// app/(tabs)/_layout.tsx
// Main app tab navigation with custom tab bar.

import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS, TYPOGRAPHY, RADIUS } from '@constants/design';

// ─── TAB ICON MAP ─────────────────────────────────────────────
const TAB_CONFIG: Array<{
  name: string;
  icon: string;
  iconActive: string;
  label: string;
}> = [
  { name: 'index', icon: '🏠', iconActive: '🏠', label: 'Home' },
  { name: 'workout', icon: '💪', iconActive: '💪', label: 'Workout' },
  { name: 'nutrition', icon: '🍽️', iconActive: '🍽️', label: 'Nutrition' },
  { name: 'coach', icon: '🤖', iconActive: '🤖', label: 'Coach' },
  { name: 'progress', icon: '📊', iconActive: '📊', label: 'Progress' },
];

function AnimatedTabButton({
  label,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const dotOpacity = useSharedValue(isActive ? 1 : 0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    dotOpacity.value = withTiming(1, { duration: 200 });
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        <Animated.View style={[styles.activeDot, dotStyle, !isActive && { display: 'none' }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG[index];
        if (!tab) return null;
        const isActive = state.index === index;

        return (
          <AnimatedTabButton
            key={route.key}
            label={tab.label}
            icon={isActive ? tab.iconActive : tab.icon}
            isActive={isActive}
            onPress={() => navigation.navigate(route.name)}
          />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="workout" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="progress" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    color: COLORS.brand.purpleLight,
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brand.purple,
  },
});
