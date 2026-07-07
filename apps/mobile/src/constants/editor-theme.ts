import { appTheme } from './app-theme';

/** Dark CapCut-style studio tokens — preview + timeline chrome. */
export const editorTheme = {
  background: '#0B0B0C',
  surface: '#151516',
  surfaceRaised: '#1C1C1E',
  border: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  preview: '#000000',
  accent: appTheme.accent,
  accentText: appTheme.accentText,
  danger: '#FF453A',
} as const;
