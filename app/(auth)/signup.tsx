// app/(auth)/signup.tsx
// Signup screen with name, email, password, and age consent.

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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    // SECURITY: Strip HTML tags from name input
    .transform((n) => n.trim().replace(/<[^>]*>/g, '')),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email')
    .max(254, 'Email is too long')
    .transform((e) => e.trim().toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      'Password must contain at least one letter and one number',
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  ageConsent: z.boolean().refine((v) => v === true, {
    message: 'You must be at least 16 years old to use APEX',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      ageConsent: false,
    },
  });

  const onSubmit = useCallback(async (values: SignupFormValues) => {
    setSubmitError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await signUp(values.email, values.password, values.name);
    if (error) {
      setSubmitError(error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [signUp]);

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.successContent}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Account created!</Text>
          <Text style={styles.successSubtitle}>
            Check your email to verify your account, then sign in.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.successButton}
          >
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Go to Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

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
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your 14-day free trial today</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.trialBadge}>
          <Text style={styles.trialText}>✨ 14-day free trial • No card required</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.form}>
          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your Name</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  placeholder="What should we call you?"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  maxLength={100}
                />
              )}
            />
            {errors.name ? <Text style={styles.fieldError}>{errors.name.message}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email ? styles.inputError : null]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  maxLength={254}
                />
              )}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
          </View>

          {/* Password */}
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
                    placeholder="Min 8 chars, letters + numbers"
                    placeholderTextColor={COLORS.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="next"
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

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  maxLength={128}
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
            ) : null}
          </View>

          {/* Age consent toggle */}
          <View style={styles.consentRow}>
            <Controller
              control={control}
              name="ageConsent"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{
                    false: COLORS.bg.elevated,
                    true: COLORS.brand.purple,
                  }}
                  thumbColor={COLORS.text.primary}
                />
              )}
            />
            <Text style={styles.consentText}>
              I confirm I am 16 years or older
            </Text>
          </View>
          {errors.ageConsent ? (
            <Text style={styles.fieldError}>{errors.ageConsent.message}</Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
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
                <Text style={styles.submitText}>Start Free Trial</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signinRow}>
            <Text style={styles.signinPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: { marginBottom: 20 },
  backButton: { marginBottom: 16 },
  backText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.brand.purpleLight,
  },
  title: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['3xl'],
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
  },
  trialBadge: {
    backgroundColor: COLORS.brand.purpleMuted,
    borderWidth: 1,
    borderColor: COLORS.brand.purple,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  trialText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
  },
  form: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding + 4,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
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
  fieldGroup: { marginBottom: 16 },
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
  inputError: { borderColor: COLORS.accent.crimson },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  fieldError: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.accent.crimson,
    marginTop: 6,
    marginLeft: 4,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  consentText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  submitButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
  },
  submitText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.tracking.wide,
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signinPrompt: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  signinLink: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.brand.purpleLight,
  },

  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  successContent: { alignItems: 'center', maxWidth: 320 },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: { width: '100%' },
  gradientButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.primary,
  },
});
