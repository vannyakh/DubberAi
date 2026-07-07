import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, spacing } from '@/constants';

interface Props {
  onHeightChange?: (height: number) => void;
}

/** Custom Expo Router stack header for the Account tab. */
export function SettingsStackHeader({ onHeightChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.shell} onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}>
      <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.webFallback]} />
      ) : null}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Account</Text>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  webFallback: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  content: {
    position: 'relative',
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: appTheme.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: appTheme.border,
  },
});
