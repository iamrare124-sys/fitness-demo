// app/(modals)/privacy.tsx
// Privacy Policy screen — required by Google Play for apps collecting health data.

import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Section title="1. Information We Collect">
          {`APEX collects the following information to provide our AI fitness coaching service:

• Account information: email address, name
• Fitness profile: goals, equipment, injuries, workout preferences
• Health data: weight logs, workout sessions, nutrition logs
• Body photos: only when you voluntarily submit them for body analysis
• Usage data: feature interactions (anonymized, no PII)`}
        </Section>

        <Section title="2. How We Use Your Information">
          {`• To generate personalized AI workout plans and nutrition recommendations
• To power the AI coach chat feature with your fitness context
• To track your progress and show analytics
• To send workout reminders (if enabled)
• We NEVER sell your personal data to third parties
• We NEVER use your data for advertising`}
        </Section>

        <Section title="3. Body Photos">
          {`Body photos submitted for AI analysis are:
• Stored encrypted in private Supabase Storage
• Accessible only to you — no APEX employee views them
• Automatically deleted after 90 days
• Never used for training AI models
• Never shared with any third party`}
        </Section>

        <Section title="4. Third-Party Services">
          {`APEX uses the following third-party services:
• Supabase (database & storage): supabase.com/privacy
• OpenAI (AI analysis): openai.com/privacy — food photos and messages are sent for analysis
• RevenueCat (subscriptions): revenuecat.com/privacy
• PostHog (analytics): posthog.com/privacy — anonymous usage only
• Sentry (error tracking): sentry.io/privacy — no health data included in error reports`}
        </Section>

        <Section title="5. Data Security">
          {`• All data transmitted over HTTPS (TLS 1.3)
• Authentication tokens stored in device encrypted storage (SecureStore)
• Row-Level Security: your data is strictly isolated from other users
• No APEX employee has access to your health data or body photos`}
        </Section>

        <Section title="6. Your Rights">
          {`You have the right to:
• Access all your data: tap Profile → Export Data
• Delete all your data: tap Profile → Delete Account
• Request data portability: contact privacy@apexfitness.in
• Opt out of analytics: tap Profile → Settings → Analytics

Data deletion is permanent and irreversible.`}
        </Section>

        <Section title="7. Children's Privacy">
          {`APEX is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe a child has provided us with personal information, please contact us at privacy@apexfitness.in.`}
        </Section>

        <Section title="8. Health Disclaimer">
          {`APEX provides AI-powered fitness guidance for informational purposes only. This is NOT medical advice. Always consult a qualified healthcare professional before starting any fitness program, especially if you have pre-existing medical conditions.

AI body composition estimates have a ±5% margin of error and are not clinical measurements.`}
        </Section>

        <Section title="9. Contact">
          {`For privacy concerns or requests:
Email: privacy@apexfitness.in
Address: APEX Fitness Technologies, Bangalore, Karnataka, India`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.body}>{children}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  body: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  closeButton: { marginBottom: 12 },
  closeText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.brand.purpleLight,
  },
  title: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  lastUpdated: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
  content: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 20,
  },
});
