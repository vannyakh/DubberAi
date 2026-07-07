/**
 * Platform-agnostic design tokens shared by web (ui-react), desktop,
 * and mobile (ui-native). Values are plain numbers/strings so they work
 * with Tailwind, inline styles, and React Native StyleSheet alike.
 */

export const palette = {
  teal50: '#f0fdfa',
  teal400: '#2dd4bf',
  teal500: '#14b8a6',
  teal600: '#0d9488',

  neutral0: '#ffffff',
  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral200: '#e5e5e5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  neutral950: '#0a0a0a',

  red500: '#ef4444',
  amber500: '#f59e0b',
  emerald500: '#10b981',
  sky500: '#0ea5e9',
  fuchsia500: '#d946ef',
} as const;

/** Spacing scale in px (multiply by device scale on native if needed). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Border radius scale in px. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  body: {
    fontSize: fontSizes.md,
    lineHeight: 1.5,
    fontWeight: '400',
  },
  label: {
    fontSize: fontSizes.xs,
    lineHeight: 1.3,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: fontSizes.xl,
    lineHeight: 1.25,
    fontWeight: '700',
  },
} as const;
