/**
 * Gemini-inspired design tokens for Listic.
 */

export const colors = {
  // Backgrounds
  bg: '#131314',
  bgSecondary: '#1E1F20',
  bgTertiary: '#282A2C',
  surface: '#1E1F20',
  surfaceHover: '#282A2C',

  // Text
  textPrimary: '#E3E3E3',
  textSecondary: '#9AA0A6',
  textTertiary: '#6B7280',
  textOnAccent: '#131314',

  // Accent (Gemini blue-purple tones)
  accent: '#8AB4F8',
  accentSoft: 'rgba(138, 180, 248, 0.12)',
  accentMedium: 'rgba(138, 180, 248, 0.24)',

  // Gradient
  gradientStart: '#8AB4F8',
  gradientEnd: '#C58AF9',

  // Borders
  border: '#3C4043',
  borderLight: '#2A2B2E',

  // Status
  success: '#81C995',
  warning: '#FDD663',
  error: '#F28B82',
  info: '#8AB4F8',

  // Platform brand colors
  amazon: '#FF9900',
  flipkart: '#2874F0',
  meesho: '#E91E63',
  ajio: '#D4A574',
  gumroad: '#FF90E8',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 36,
  '5xl': 44,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Responsive breakpoints */
export const breakpoints = {
  /** Compact phone */
  sm: 480,
  /** Tablet / small desktop */
  md: 768,
  /** Desktop */
  lg: 1024,
  /** Wide desktop */
  xl: 1280,
};

/** Max-width for centered content on desktop */
export const layout = {
  contentMaxWidth: 720,
  wideMaxWidth: 960,
  sidebarWidth: 260,
};
