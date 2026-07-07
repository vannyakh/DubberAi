import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authTheme } from '@/constants/auth-theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'dark' | 'light';
}

/** Auth flow wrapper — applies top safe area for notch / Dynamic Island. */
export function AuthScreenLayout({ children, style, variant = 'light' }: Props) {
  const backgroundColor = variant === 'dark' ? authTheme.background : authTheme.backgroundLight;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
