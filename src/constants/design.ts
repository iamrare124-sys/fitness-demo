// src/constants/design.ts
// APEX Design System — Premium dark fitness aesthetic
// Primary palette: deep black + electric violet + pure white
// Accent palette: energy amber + success emerald + danger crimson

export const COLORS = {
  // ─── BACKGROUNDS ─────────────────────────────────────────
  bg: {
    primary: '#0A0A0A',     // Near-black canvas
    secondary: '#111111',   // Card backgrounds
    tertiary: '#1A1A1A',    // Elevated cards
    elevated: '#222222',    // Modals, sheets
    overlay: 'rgba(0,0,0,0.85)',
  },

  // ─── BRAND / PRIMARY ─────────────────────────────────────
  brand: {
    purple: '#7C3AED',      // Primary action — electric violet
    purpleLight: '#9D5CF5', // Hover/active states
    purpleDark: '#5B21B6',  // Pressed states
    purpleGlow: 'rgba(124, 58, 237, 0.25)',
    purpleMuted: 'rgba(124, 58, 237, 0.15)',
  },

  // ─── ACCENT COLORS ───────────────────────────────────────
  accent: {
    amber: '#F59E0B',       // Energy, streaks, warnings
    amberGlow: 'rgba(245, 158, 11, 0.2)',
    emerald: '#10B981',     // Success, completion, good
    emeraldGlow: 'rgba(16, 185, 129, 0.2)',
    crimson: '#EF4444',     // Error, danger, over-limit
    crimsonGlow: 'rgba(239, 68, 68, 0.2)',
    sky: '#38BDF8',         // Info, links
    rose: '#FB7185',        // Soft highlight
  },

  // ─── TEXT ────────────────────────────────────────────────
  text: {
    primary: '#FFFFFF',     // Headings, primary content
    secondary: '#A1A1AA',   // Secondary content
    tertiary: '#71717A',    // Placeholder, disabled
    inverse: '#0A0A0A',     // Text on light backgrounds
    brand: '#9D5CF5',       // Brand-colored text
  },

  // ─── BORDERS ─────────────────────────────────────────────
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.10)',
    strong: 'rgba(255,255,255,0.18)',
    brand: 'rgba(124, 58, 237, 0.40)',
  },

  // ─── MUSCLE GROUP COLORS ─────────────────────────────────
  muscle: {
    chest: '#EF4444',
    back: '#3B82F6',
    shoulders: '#F59E0B',
    arms: '#8B5CF6',
    legs: '#10B981',
    core: '#F97316',
    cardio: '#EC4899',
    full_body: '#06B6D4',
  },

  // ─── MACRO COLORS ────────────────────────────────────────
  macro: {
    protein: '#3B82F6',     // Blue for protein
    carbs: '#F59E0B',       // Amber for carbs
    fat: '#EF4444',         // Red for fat
    fiber: '#10B981',       // Green for fiber
    calories: '#7C3AED',    // Purple for calories
  },

  // ─── GRADIENTS (as string arrays for LinearGradient) ─────
  gradient: {
    brand: ['#7C3AED', '#5B21B6'],
    brandHorizontal: ['#9D5CF5', '#7C3AED'],
    dark: ['#1A1A1A', '#0A0A0A'],
    success: ['#10B981', '#059669'],
    energy: ['#F59E0B', '#D97706'],
    fire: ['#EF4444', '#F97316'],

    // Daily motivation gradients (rotates by day of week)
    daily: [
      ['#7C3AED', '#2D1B69'],  // Mon: Purple depths
      ['#0EA5E9', '#0C4A6E'],  // Tue: Ocean drive
      ['#10B981', '#064E3B'],  // Wed: Forest power
      ['#F59E0B', '#78350F'],  // Thu: Solar energy
      ['#EF4444', '#7F1D1D'],  // Fri: Fire motivation
      ['#EC4899', '#831843'],  // Sat: Rose strength
      ['#06B6D4', '#164E63'],  // Sun: Recovery blue
    ],
  },
} as const;

export const TYPOGRAPHY = {
  // Font families (using system fonts as fallback, custom fonts load via expo-font)
  family: {
    display: 'SpaceGrotesk-Bold',    // Headings — geometric, strong
    displayMedium: 'SpaceGrotesk-Medium',
    body: 'Inter-Regular',           // Body text — clean, readable
    bodyMedium: 'Inter-Medium',
    bodySemiBold: 'Inter-SemiBold',
    bodyBold: 'Inter-Bold',
    mono: 'JetBrainsMono-Regular',   // Numbers, metrics
  },

  // Sizes (in px, React Native uses unitless)
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
    '5xl': 52,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Letter spacing
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 2.0,
  },
} as const;

export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,

  // Semantic spacing
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  brand: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// Z-index layers
export const Z_INDEX = {
  base: 0,
  card: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

// Animation durations (ms)
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;

// Limits
export const LIMITS = {
  free: {
    foodScansPerDay: 5,
    aiMessagesPerDay: 10,
  },
  pro: {
    foodScansPerDay: Infinity,
    aiMessagesPerDay: Infinity,
  },
  elite: {
    foodScansPerDay: Infinity,
    aiMessagesPerDay: Infinity,
  },
} as const;
