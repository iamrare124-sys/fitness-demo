// app/(modals)/terms.tsx
// Terms of Service — required by Google Play.

import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '@constants/design';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>
            ⚕️ APEX provides AI-powered fitness guidance for informational purposes only. This is NOT medical advice. Always consult a qualified healthcare professional before starting any fitness program.
          </Text>
        </View>

        <Section title="1. Acceptance of Terms">
          By downloading, installing, or using APEX, you agree to these Terms of Service. If you do not agree, please do not use the app.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 16 years old to use APEX. By using the app, you confirm you meet this requirement. Users between 16-18 should have parental or guardian consent.
        </Section>

        <Section title="3. Subscription Terms">
          {`Free Trial: 14 days of full Pro access. No credit card required.

Pro Plan: ₹299/month or ₹2,499/year
Elite Plan: ₹699/month or ₹5,999/year

• Subscriptions auto-renew unless cancelled at least 24 hours before renewal
• Cancel anytime in Settings → Manage Subscription
• Refund Policy: 7-day money-back guarantee on first purchase. Request at support@apexfitness.in within 7 days of purchase`}
        </Section>

        <Section title="4. Health & Medical Disclaimer">
          {`APEX is a fitness guidance tool, NOT a medical service:

• AI-generated workout plans are for informational purposes only
• Food nutrition estimates have a 10-15% margin of error
• Body composition estimates have a ±5% margin of error
• AI coach responses are not professional medical, nutritional, or psychological advice

Always consult a licensed healthcare professional before:
• Starting a new exercise program
• Making significant dietary changes
• Training with an injury or medical condition`}
        </Section>

        <Section title="5. User Responsibilities">
          {`You agree to:
• Provide accurate information about injuries and health conditions
• Use APEX for personal, non-commercial use only
• Not attempt to reverse-engineer, hack, or abuse the service
• Not submit false or misleading health data
• Stop using any feature immediately if you experience pain or injury`}
        </Section>

        <Section title="6. Limitation of Liability">
          APEX and its creators are not liable for any injury, health complications, or damages arising from following AI-generated fitness or nutrition recommendations. Use of the app is at your own risk.
        </Section>

        <Section title="7. Intellectual Property">
          All content, AI-generated plans, and app features are the property of APEX Fitness Technologies. You may not copy, distribute, or reproduce app content without written permission.
        </Section>

        <Section title="8. Termination">
          We reserve the right to suspend accounts that violate these terms, engage in abuse, or attempt to circumvent subscription limits.
        </Section>

        <Section title="9. Contact">
          {`For support or legal inquiries:
Email: legal@apexfitness.in
Support: support@apexfitness.in`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={sStyles.container}>
      <Text style={sStyles.title}>{title}</Text>
      <Text style={sStyles.body}>{children}</Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 10 },
  body: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, lineHeight: 22 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { paddingHorizontal: SPACING.screenPadding, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle },
  closeButton: { marginBottom: 12 },
  closeText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.brand.purpleLight },
  title: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, marginBottom: 4 },
  lastUpdated: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
  content: { paddingHorizontal: SPACING.screenPadding, paddingTop: 20 },
  disclaimerBanner: { backgroundColor: COLORS.accent.amberGlow, borderWidth: 1, borderColor: COLORS.accent.amber, borderRadius: 12, padding: 14, marginBottom: 24 },
  disclaimerText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.accent.amber, lineHeight: 20 },
});
