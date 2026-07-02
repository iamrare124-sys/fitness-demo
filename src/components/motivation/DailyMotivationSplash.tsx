// src/components/motivation/DailyMotivationSplash.tsx
// Full-screen motivational splash shown on every app open.
// Uses cached daily quote (AI-generated or local fallback).
// Share button generates Instagram-ready image via react-native-view-shot.

import { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';

import { useAuthStore } from '@stores/authStore';
import { getDailyQuote } from '@constants/motivationQuotes';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';
import type { FitnessGoal } from '@types/index';

const { width, height } = Dimensions.get('window');

// 7 gradient pairs — one per day of week
const DAILY_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#2D1B69'],
  ['#0EA5E9', '#0C4A6E'],
  ['#10B981', '#064E3B'],
  ['#F59E0B', '#78350F'],
  ['#EF4444', '#7F1D1D'],
  ['#EC4899', '#831843'],
  ['#06B6D4', '#164E63'],
];

function getTodayGradient(): [string, string] {
  const dayIndex = new Date().getDay(); // 0=Sun, 6=Sat
  return DAILY_GRADIENTS[dayIndex] ?? DAILY_GRADIENTS[0];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DailyMotivationSplashProps {
  onDismiss: () => void;
}

export function DailyMotivationSplash({ onDismiss }: DailyMotivationSplashProps) {
  const { profile } = useAuthStore();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const gradient = getTodayGradient();
  const greeting = getGreeting();

  // Get today's quote (cached by date, falls back to local if AI unavailable)
  const goal = (profile?.goal as FitnessGoal | null | undefined) ?? 'general_fitness';
  const quote = getDailyQuote(goal === 'maintenance' ? 'maintenance' : goal === 'muscle_gain' ? 'muscle_gain' : goal === 'weight_loss' ? 'weight_loss' : 'general_fitness');

  // Animation values
  const buttonScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Button slides in after quote fades
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 12 });
      buttonOpacity.value = withTiming(1, { duration: 400 });
    }, 800);
  }, [buttonScale, buttonOpacity]);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: buttonOpacity.value,
  }));

  const handleShare = useCallback(async () => {
    if (!viewShotRef.current) return;
    setIsSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Capture the card as an image
      const uri = await (viewShotRef.current as unknown as { capture: () => Promise<string> }).capture();
      await Share.share({
        url: uri,
        message: `"${quote}" — APEX Fitness`,
        title: 'APEX Daily Motivation',
      });
    } catch (error) {
      console.error('[Motivation] Share error:', error);
    } finally {
      setIsSharing(false);
    }
  }, [quote]);

  const handleCrushIt = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDismiss();
  }, [onDismiss]);

  const firstName = profile?.name?.split(' ')[0] ?? 'Champion';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradient} style={styles.gradient}>
        {/* Shareable card area */}
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }}>
          <LinearGradient colors={gradient} style={styles.shareCard}>
            {/* APEX branding watermark */}
            <View style={styles.brandRow}>
              <View style={styles.apexBadge}>
                <Text style={styles.apexText}>APEX</Text>
              </View>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>

            {/* Greeting */}
            <Animated.View entering={FadeInDown.duration(700).delay(100)}>
              <Text style={styles.greeting}>
                {greeting},{'\n'}
                <Text style={styles.name}>{firstName} 💪</Text>
              </Text>
            </Animated.View>

            {/* Quote */}
            <Animated.View
              entering={FadeIn.duration(800).delay(400)}
              style={styles.quoteContainer}
            >
              <Text style={styles.quoteMark}>"</Text>
              <Text style={styles.quoteText}>{quote}</Text>
              <Text style={[styles.quoteMark, styles.quoteMarkClose]}>"</Text>
            </Animated.View>
          </LinearGradient>
        </ViewShot>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {/* Share button */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.shareRow}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareButton}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color={COLORS.text.secondary} size="small" />
              ) : (
                <Text style={styles.shareButtonText}>📸 Share</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Primary CTA */}
          <Animated.View style={buttonAnimStyle}>
            <TouchableOpacity
              onPress={handleCrushIt}
              activeOpacity={0.9}
              style={styles.crushButton}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.crushGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.crushText}>Let's crush it →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: SPACING.screenPadding,
  },
  shareCard: {
    borderRadius: RADIUS['2xl'],
    padding: SPACING.cardPadding + 4,
    minHeight: height * 0.55,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  apexBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  apexText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#FFFFFF',
    letterSpacing: TYPOGRAPHY.tracking.widest,
  },
  dateText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  greeting: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xl,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 32,
  },
  name: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: '#FFFFFF',
  },
  quoteContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: SPACING[6],
  },
  quoteMark: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: 64,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 56,
    marginBottom: -16,
  },
  quoteMarkClose: {
    textAlign: 'right',
    marginTop: -16,
    marginBottom: 0,
  },
  quoteText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.xl,
    color: '#FFFFFF',
    lineHeight: 32,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actionsContainer: {
    gap: SPACING[3],
    marginTop: SPACING[5],
  },
  shareRow: {
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  shareButtonText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  crushButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  crushGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  crushText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.xl,
    color: '#FFFFFF',
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
});
