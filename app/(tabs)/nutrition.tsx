// app/(tabs)/nutrition.tsx
// Food scanner, meal log, and daily macro tracking.

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { supabase } from '@services/supabase';
import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@stores/subscriptionStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';
import type { NutritionScanResult, MealType, FoodItem } from '@types/index';

const MEAL_SLOTS: Array<{ id: MealType; label: string; emoji: string; timeHint: string }> = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅', timeHint: '6-10 AM' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️', timeHint: '12-2 PM' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙', timeHint: '7-9 PM' },
  { id: 'snack', label: 'Snacks', emoji: '🍎', timeHint: 'Anytime' },
];

const MACRO_TARGETS = { calories: 2000, protein: 150, carbs: 220, fat: 65 };

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isPro, isTrialActive, checkUsageLimit } = useSubscriptionStore();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<NutritionScanResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Today's logs
  const { data: todayLogs = [], refetch } = useQuery({
    queryKey: ['nutrition', 'today', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`)
        .order('logged_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Compute daily totals
  const totals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories ?? 0),
      protein: acc.protein + (log.total_protein_g ?? 0),
      carbs: acc.carbs + (log.total_carbs_g ?? 0),
      fat: acc.fat + (log.total_fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Scan food photo
  const handleScanFood = useCallback(async (source: 'camera' | 'gallery') => {
    if (!user?.id) return;

    // Check rate limit for free users
    if (!isPro && !isTrialActive) {
      const { allowed, count, limit } = await checkUsageLimit(user.id, 'food_scans_count');
      if (!allowed) {
        Alert.alert(
          'Daily Limit Reached',
          `You've used ${count}/${limit} free scans today. Upgrade to Pro for unlimited scanning.`,
          [{ text: 'OK' }],
        );
        return;
      }
    }

    let result;
    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
      });
    }

    if (result.canceled || !result.assets[0]) return;

    const imageUri = result.assets[0].uri;

    // Validate file size (max 10MB)
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > 10 * 1024 * 1024) {
      Alert.alert('Image too large', 'Please choose an image smaller than 10MB.');
      return;
    }

    setScanning(true);
    setScannedImageUri(imageUri);
    setScanResult(null);

    try {
      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(fileName, Buffer.from(base64, 'base64'), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw new Error('Upload failed');

      // Get signed URL (private bucket)
      const { data: { signedUrl } } = await supabase.storage
        .from('food-photos')
        .createSignedUrl(fileName, 3600); // 1 hour

      // Call Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/scan-food`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: signedUrl }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Scan failed');
      }

      const result = await res.json() as NutritionScanResult;
      setScanResult(result);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Nutrition] Scan error:', error);
      Alert.alert('Scan Failed', 'Could not analyze the photo. Please try again.');
    } finally {
      setScanning(false);
    }
  }, [user?.id, isPro, isTrialActive, checkUsageLimit]);

  const handleLogMeal = useCallback(async () => {
    if (!scanResult || !user?.id) return;

    await supabase.from('nutrition_logs').insert({
      user_id: user.id,
      meal_type: selectedMealType,
      food_photo_url: scannedImageUri ?? null,
      food_items: scanResult.foods as unknown as Record<string, unknown>[],
      total_calories: Math.round(scanResult.total_calories),
      total_protein_g: scanResult.total_protein,
      total_carbs_g: scanResult.total_carbs,
      total_fat_g: scanResult.total_fat,
      ai_confidence: scanResult.confidence_score,
    });

    setScanResult(null);
    setScannedImageUri(null);
    await refetch();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [scanResult, selectedMealType, user?.id, scannedImageUri, refetch]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.title}>Nutrition</Text>

      {/* Daily summary */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Progress</Text>
        <MacroBar label="Calories" value={totals.calories} target={MACRO_TARGETS.calories} unit="kcal" color={COLORS.macro.calories} />
        <MacroBar label="Protein" value={totals.protein} target={MACRO_TARGETS.protein} unit="g" color={COLORS.macro.protein} />
        <MacroBar label="Carbs" value={totals.carbs} target={MACRO_TARGETS.carbs} unit="g" color={COLORS.macro.carbs} />
        <MacroBar label="Fat" value={totals.fat} target={MACRO_TARGETS.fat} unit="g" color={COLORS.macro.fat} />
      </Animated.View>

      {/* Scan buttons */}
      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.scanRow}>
        <TouchableOpacity
          onPress={() => handleScanFood('camera')}
          style={[styles.scanButton, { flex: 1 }]}
          disabled={scanning}
        >
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.scanGradient}>
            {scanning ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.scanEmoji}>📷</Text>
                <Text style={styles.scanText}>Scan Food</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleScanFood('gallery')}
          style={styles.galleryButton}
          disabled={scanning}
        >
          <Text style={styles.galleryEmoji}>🖼️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Scan result */}
      {scanResult && (
        <Animated.View entering={FadeInUp.duration(500)} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Scan Result</Text>
            <View style={[
              styles.confidenceBadge,
              { backgroundColor: scanResult.confidence_score > 0.8 ? COLORS.accent.emeraldGlow : COLORS.accent.amberGlow },
            ]}>
              <Text style={[
                styles.confidenceText,
                { color: scanResult.confidence_score > 0.8 ? COLORS.accent.emerald : COLORS.accent.amber },
              ]}>
                {Math.round(scanResult.confidence_score * 100)}% confident
              </Text>
            </View>
          </View>

          {scanResult.foods.map((food, i) => (
            <View key={i} style={styles.foodItem}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodPortion}>{food.portion_size}</Text>
              <View style={styles.macroRow}>
                <MacroChip label="Cal" value={food.calories} color={COLORS.macro.calories} />
                <MacroChip label="P" value={food.protein_g} color={COLORS.macro.protein} />
                <MacroChip label="C" value={food.carbs_g} color={COLORS.macro.carbs} />
                <MacroChip label="F" value={food.fat_g} color={COLORS.macro.fat} />
              </View>
            </View>
          ))}

          {scanResult.notes && (
            <Text style={styles.resultNotes}>ℹ️ {scanResult.notes}</Text>
          )}

          {/* Meal type selector */}
          <View style={styles.mealTypeRow}>
            {MEAL_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                onPress={() => setSelectedMealType(slot.id)}
                style={[
                  styles.mealTypeChip,
                  selectedMealType === slot.id && styles.mealTypeChipSelected,
                ]}
              >
                <Text style={styles.mealTypeEmoji}>{slot.emoji}</Text>
                <Text style={[
                  styles.mealTypeLabel,
                  selectedMealType === slot.id && styles.mealTypeLabelSelected,
                ]}>
                  {slot.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleLogMeal}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.logButton}>
              <Text style={styles.logButtonText}>✓ Log as {MEAL_SLOTS.find(m => m.id === selectedMealType)?.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Meal slots */}
      <Text style={styles.sectionTitle}>Today's Meals</Text>
      {MEAL_SLOTS.map((slot) => {
        const slotLogs = todayLogs.filter((l) => l.meal_type === slot.id);
        const slotCals = slotLogs.reduce((s, l) => s + (l.total_calories ?? 0), 0);
        return (
          <View key={slot.id} style={styles.mealSlot}>
            <View style={styles.mealSlotHeader}>
              <Text style={styles.mealSlotEmoji}>{slot.emoji}</Text>
              <View>
                <Text style={styles.mealSlotName}>{slot.label}</Text>
                <Text style={styles.mealSlotTime}>{slot.timeHint}</Text>
              </View>
              <Text style={styles.mealSlotCals}>
                {slotCals > 0 ? `${slotCals} kcal` : '—'}
              </Text>
            </View>
            {slotLogs.map((log, i) => (
              <View key={log.id} style={styles.logEntry}>
                <Text style={styles.logEntryText}>
                  {(log.food_items as FoodItem[] | null)?.[0]?.name ?? 'Meal'} • {log.total_calories} kcal
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function MacroBar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = Math.min(value / Math.max(target, 1), 1);
  const isOver = value > target;
  return (
    <View style={macroStyles.row}>
      <Text style={macroStyles.label}>{label}</Text>
      <View style={macroStyles.track}>
        <View style={[macroStyles.fill, { width: `${pct * 100}%`, backgroundColor: isOver ? COLORS.accent.crimson : color }]} />
      </View>
      <Text style={[macroStyles.value, isOver && { color: COLORS.accent.crimson }]}>
        {Math.round(value)}/{target}{unit}
      </Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, width: 60 },
  track: { flex: 1, height: 6, backgroundColor: COLORS.bg.elevated, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  value: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, width: 80, textAlign: 'right' },
});

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[chipStyles.chip, { borderColor: color + '40', backgroundColor: color + '15' }]}>
      <Text style={[chipStyles.label, { color }]}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center' },
  label: { fontFamily: TYPOGRAPHY.family.bodySemiBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.sm },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  content: { paddingHorizontal: SPACING.screenPadding },
  title: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size['2xl'], color: COLORS.text.primary, marginBottom: SPACING.sectionGap },
  summaryCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.xl, padding: SPACING.cardPadding, marginBottom: SPACING.sectionGap, borderWidth: 1, borderColor: COLORS.border.subtle },
  summaryTitle: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 14 },
  scanRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.sectionGap },
  scanButton: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  scanGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  scanEmoji: { fontSize: 20 },
  scanText: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: '#FFF' },
  galleryButton: { width: 56, backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border.default },
  galleryEmoji: { fontSize: 22 },
  resultCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.xl, padding: SPACING.cardPadding, marginBottom: SPACING.sectionGap, borderWidth: 1, borderColor: COLORS.border.default },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultTitle: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.lg, color: COLORS.text.primary },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  confidenceText: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.xs },
  foodItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle },
  foodName: { fontFamily: TYPOGRAPHY.family.bodyMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 2 },
  foodPortion: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginBottom: 8 },
  macroRow: { flexDirection: 'row', gap: 8 },
  resultNotes: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: 12, lineHeight: 20 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 },
  mealTypeChip: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bg.tertiary, borderRadius: RADIUS.md, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border.subtle },
  mealTypeChipSelected: { backgroundColor: COLORS.brand.purpleMuted, borderColor: COLORS.brand.purple },
  mealTypeEmoji: { fontSize: 16, marginBottom: 2 },
  mealTypeLabel: { fontFamily: TYPOGRAPHY.family.body, fontSize: 10, color: COLORS.text.tertiary },
  mealTypeLabelSelected: { color: COLORS.brand.purpleLight },
  logButton: { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  logButtonText: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: '#FFF' },
  sectionTitle: { fontFamily: TYPOGRAPHY.family.display, fontSize: TYPOGRAPHY.size.lg, color: COLORS.text.primary, marginBottom: SPACING[3] },
  mealSlot: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.cardPadding, marginBottom: SPACING[3], borderWidth: 1, borderColor: COLORS.border.subtle },
  mealSlotHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealSlotEmoji: { fontSize: 28 },
  mealSlotName: { fontFamily: TYPOGRAPHY.family.displayMedium, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, marginBottom: 2 },
  mealSlotTime: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
  mealSlotCals: { marginLeft: 'auto', fontFamily: TYPOGRAPHY.family.bodySemiBold, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
  logEntry: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  logEntryText: { fontFamily: TYPOGRAPHY.family.body, fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
});
