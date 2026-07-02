// app/(auth)/forgot-password.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    const { error: err } = await resetPassword(cleanEmail);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.center}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            We sent a password reset link to {email}. Check your inbox and spam folder.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.button}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
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
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a reset link.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.text.tertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          maxLength={254}
        />

        <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
          <LinearGradient
            colors={isLoading ? ['#4B5563', '#374151'] : ['#7C3AED', '#5B21B6']}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  back: { marginBottom: 24 },
  backText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.brand.purpleLight,
  },
  title: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  body: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  label: {
    fontFamily: TYPOGRAPHY.family.bodySemiBold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  inputError: { borderColor: COLORS.accent.crimson },
  errorBanner: {
    backgroundColor: COLORS.accent.crimsonGlow,
    borderWidth: 1,
    borderColor: COLORS.accent.crimson,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accent.crimson,
    textAlign: 'center',
  },
  button: {
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
