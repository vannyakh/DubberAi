import { palette } from './tokens';

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  danger: string;
  success: string;
}

export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: palette.neutral50,
    surface: palette.neutral0,
    border: palette.neutral200,
    textPrimary: palette.neutral900,
    textSecondary: palette.neutral600,
    textMuted: palette.neutral400,
    accent: palette.teal500,
    accentHover: palette.teal600,
    danger: palette.red500,
    success: palette.emerald500,
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: palette.neutral950,
    surface: palette.neutral900,
    border: palette.neutral800,
    textPrimary: palette.neutral100,
    textSecondary: palette.neutral300,
    textMuted: palette.neutral500,
    accent: palette.teal400,
    accentHover: palette.teal500,
    danger: palette.red500,
    success: palette.emerald500,
  },
};

export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
