// app/(auth)/login.tsx
// Login screen with email/password, input validation, and rate limiting.
// Uses react-hook-form + zod for validated inputs.

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

// ─── VALIDATION SCHEMA ────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email')
    .max(254, 'Email is too long')
    .transform((e) => e.trim().toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Button press animation
  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(async (values: LoginFormValues) => {
    setSubmitError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await signIn(values.email, values.password);
    if (error) {
      setSubmitError(error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    // On success, _layout.tsx AuthGuard handles navigation
  }, [signIn]);

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.97, { damping: 15 });
  };
  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            style={styles.logoBadge}
          >
            <Text style={styles.logoText}>APEX</Text>
          </LinearGradient>
          <Text style={styles.tagline}>Your AI Fitness Operating System</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          {/* Submit error banner */}
          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.email ? styles.inputError : null,
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={254}
                />
              )}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            ) : null}
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      errors.password ? styles.inputError : null,
                    ]}
                    placeholder="Your password"
                    placeholderTextColor={COLORS.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    maxLength={128}
                  />
                )}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            ) : null}
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit button */}
          <Animated.View style={buttonAnimStyle}>
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              activeOpacity={1}
            >
              <LinearGradient
                colors={isLoading ? ['#4B5563', '#374151'] : ['#7C3AED', '#5B21B6']}
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign up free</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Health disclaimer */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            By signing in, you agree to our{' '}
            <Text
              style={styles.disclaimerLink}
              onPress={() => router.push('/(modals)/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.disclaimerLink}
              onPress={() => router.push('/(modals)/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  logoText: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.tracking.widest,
  },
  tagline: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  form: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding + 4,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  title: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: COLORS.accent.crimsonGlow,
    borderWidth: 1,
    borderColor: COLORS.accent.crimson,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accent.crimson,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    marginBottom: 8,
    letterSpacing: TYPOGRAPHY.tracking.wide,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.bg.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
  },
  inputError: {
    borderColor: COLORS.accent.crimson,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  fieldError: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.accent.crimson,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
  },
  submitButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupPrompt: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  signupLink: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
  },
  disclaimer: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimerLink: {
    color: COLORS.brand.purpleLight,
    textDecorationLine: 'underline',
  },
});
