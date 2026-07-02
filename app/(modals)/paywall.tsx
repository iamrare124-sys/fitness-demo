// app/(modals)/paywall.tsx
// Subscription paywall with Pro vs Elite comparison and RevenueCat integration.
// Triggered on trial expiry or when a free user hits a feature limit.

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';

import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@stores/subscriptionStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';

// ─── PLAN FEATURES ───────────────────────────────────────────
const PRO_FEATURES = [
  '✅ Unlimited AI food scanning',
  '✅ Unlimited AI coach messages',
  '✅ AI-generated 4-week workout plans',
  '✅ Budget-aware Indian diet plans',
  '✅ Body composition AI analysis',
  '✅ Progress analytics & charts',
  '✅ Daily personalized motivation',
];

const ELITE_EXTRAS = [
  '⚡ Everything in Pro',
  '⚡ Priority AI response speed',
  '⚡ Advanced body transformation insights',
  '⚡ Video form correction (coming soon)',
  '⚡ Dedicated premium support',
];

type PlanType = 'pro_monthly' | 'pro_yearly' | 'elite_monthly' | 'elite_yearly';

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subscription, fetchSubscription } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro_yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    initRevenueCat();
  }, []);

  const initRevenueCat = async () => {
    try {
      const rcKey = Constants.expoConfig?.extra?.revenueCatKey as string | undefined;
      if (!rcKey) return;

      Purchases.configure({ apiKey: rcKey });

      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('[RevenueCat] Init error:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Find matching RevenueCat package
      const pkg = packages.find((p) =>
        p.identifier.toLowerCase().includes(selectedPlan.includes('pro') ? 'pro' : 'elite'),
      );

      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        if (Object.keys(customerInfo.entitlements.active).length > 0) {
          await fetchSubscription(user.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to APEX Pro! 🎉', 'Your subscription is now active.', [
            { text: 'Let\'s Go!', onPress: () => router.back() },
          ]);
        }
      } else {
        // Fallback: show payment coming soon
        Alert.alert(
          'Payment Processing',
          'Subscription purchase is being set up. Please contact support@apexfitness.in to complete your upgrade.',
        );
      }
    } catch (error: unknown) {
      const rcError = error as { userCancelled?: boolean };
      if (!rcError.userCancelled) {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.restorePurchases();
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        if (user?.id) await fetchSubscription(user.id);
        Alert.alert('Restored!', 'Your subscription has been restored.');
        router.back();
      } else {
        Alert.alert('No Purchases Found', 'No previous subscriptions found for this account.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const planPrices: Record<PlanType, { monthly: string; label: string; savings?: string }> = {
    pro_monthly: { monthly: '₹299/mo', label: 'Pro Monthly', },
    pro_yearly: { monthly: '₹208/mo', label: 'Pro Yearly', savings: 'Save 30% • ₹2,499/yr' },
    elite_monthly: { monthly: '₹699/mo', label: 'Elite Monthly' },
    elite_yearly: { monthly: '₹500/mo', label: 'Elite Yearly', savings: 'Save 28% • ₹5,999/yr' },
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.apexBadge}>
            <Text style={styles.apexText}>APEX</Text>
          </LinearGradient>
          <Text style={styles.headline}>
            Your trial{subscription?.status === 'trial' ? ' is ending' : ' has ended'}
          </Text>
          <Text style={styles.subheadline}>
            Keep access to your AI trainer, nutritionist, and coach — all for less than one gym session.
          </Text>
        </Animated.View>

        {/* Value comparison */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.valueCard}>
          <Text style={styles.valueTitle}>Personal trainer IRL vs APEX</Text>
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>Human Trainer</Text>
              <Text style={styles.comparePrice}>₹15,000/mo</Text>
              <Text style={styles.compareNote}>2-3 sessions/week</Text>
            </View>
            <Text style={styles.compareVs}>vs</Text>
            <View style={[styles.compareCol, styles.compareColHighlight]}>
              <Text style={[styles.compareLabel, { color: COLORS.brand.purpleLight }]}>APEX Pro</Text>
              <Text style={[styles.comparePrice, { color: COLORS.brand.purple }]}>₹299/mo</Text>
              <Text style={styles.compareNote}>24/7 AI coaching</Text>
            </View>
          </View>
        </Animated.View>

        {/* Plan selector */}
        <Animated.View entering={FadeInUp.duration(500).delay(150)}>
          <Text style={styles.choosePlan}>Choose your plan</Text>

          {/* Pro plans */}
          <Text style={styles.tierLabel}>PRO</Text>
          <View style={styles.planRow}>
            {(['pro_monthly', 'pro_yearly'] as PlanType[]).map((plan) => (
              <TouchableOpacity
                key={plan}
                onPress={() => setSelectedPlan(plan)}
                style={[styles.planCard, selectedPlan === plan && styles.planCardSelected]}
                activeOpacity={0.85}
              >
                {planPrices[plan].savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{planPrices[plan].savings}</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, selectedPlan === plan && styles.planLabelSelected]}>
                  {planPrices[plan].label}
                </Text>
                <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceSelected]}>
                  {planPrices[plan].monthly}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Elite plans */}
          <Text style={[styles.tierLabel, { marginTop: 12 }]}>ELITE</Text>
          <View style={styles.planRow}>
            {(['elite_monthly', 'elite_yearly'] as PlanType[]).map((plan) => (
              <TouchableOpacity
                key={plan}
                onPress={() => setSelectedPlan(plan)}
                style={[styles.planCard, selectedPlan === plan && styles.planCardSelected]}
                activeOpacity={0.85}
              >
                {planPrices[plan].savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{planPrices[plan].savings}</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, selectedPlan === plan && styles.planLabelSelected]}>
                  {planPrices[plan].label}
                </Text>
                <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceSelected]}>
                  {planPrices[plan].monthly}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Features list */}
          <View style={styles.featuresCard}>
            {(selectedPlan.includes('elite') ? ELITE_EXTRAS : PRO_FEATURES).map((f) => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>

          {/* Guarantees */}
          <View style={styles.guaranteeRow}>
            <Text style={styles.guaranteeItem}>🔒 Cancel anytime</Text>
            <Text style={styles.guaranteeItem}>💰 7-day refund</Text>
            <Text style={styles.guaranteeItem}>🚫 No hidden fees</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Purchase CTA - sticky bottom */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(300)}
        style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity onPress={handlePurchase} disabled={isLoading} activeOpacity={0.9}>
          <LinearGradient
            colors={isLoading ? ['#374151', '#1F2937'] : ['#7C3AED', '#5B21B6']}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  Start {selectedPlan.includes('pro') ? 'Pro' : 'Elite'}
                </Text>
                <Text style={styles.ctaSubtext}>
                  {planPrices[selectedPlan].monthly}
                  {planPrices[selectedPlan].savings ? ` • ${planPrices[selectedPlan].savings}` : ''}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore previous purchase</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  content: { paddingHorizontal: SPACING.screenPadding },
  closeButton: { alignSelf: 'flex-end', padding: 8, marginBottom: 8 },
  closeText: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.tertiary },

  header: { alignItems: 'center', marginBottom: 24 },
  apexBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.md, marginBottom: 16 },
  apexText: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: '#FFF', letterSpacing: 4 },
  headline: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, textAlign: 'center', marginBottom: 8 },
  subheadline: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },

  valueCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.xl, padding: SPACING.cardPadding, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border.subtle },
  valueTitle: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 16, textAlign: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  compareCol: { alignItems: 'center' },
  compareColHighlight: { backgroundColor: COLORS.brand.purpleMuted, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.brand.purple },
  compareLabel: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, marginBottom: 4 },
  comparePrice: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, marginBottom: 2 },
  compareNote: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
  compareVs: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary },

  choosePlan: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.primary, marginBottom: 12 },
  tierLabel: { fontFamily: TYPOGRAPHY.family.bodySemiBold, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, letterSpacing: TYPOGRAPHY.tracking.widest, marginBottom: 8 },
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  planCard: { flex: 1, backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: 14, borderWidth: 2, borderColor: COLORS.border.subtle, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  planCardSelected: { backgroundColor: COLORS.brand.purpleMuted, borderColor: COLORS.brand.purple },
  savingsBadge: { backgroundColor: COLORS.accent.emerald, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: 6 },
  savingsText: { fontFamily: TYPOGRAPHY.family.bodySemiBold, fontSize: 9, color: '#000' },
  planLabel: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, marginBottom: 4 },
  planLabelSelected: { color: COLORS.text.primary },
  planPrice: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: COLORS.text.secondary },
  planPriceSelected: { color: COLORS.brand.purpleLight },

  featuresCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.cardPadding, marginTop: 14, borderWidth: 1, borderColor: COLORS.border.subtle },
  featureItem: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, paddingVertical: 5, lineHeight: 22 },

  guaranteeRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, marginBottom: 4 },
  guaranteeItem: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },

  ctaContainer: { paddingHorizontal: SPACING.screenPadding, paddingTop: 12, backgroundColor: COLORS.bg.primary, borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  ctaButton: { borderRadius: RADIUS.lg, paddingVertical: 18, alignItems: 'center' },
  ctaText: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.xl, color: '#FFF' },
  ctaSubtext: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  restoreButton: { alignItems: 'center', paddingVertical: 14 },
  restoreText: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
});
