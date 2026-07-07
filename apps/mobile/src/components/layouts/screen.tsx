import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appTheme } from '@/constants/app-theme';
import { theme } from '@/constants';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Light home/account screens vs dark editor screens. */
  variant?: 'light' | 'dark';
}

/** SafeArea screen wrapper with the app background color. */
export function Screen({ children, style, variant = 'dark' }: Props) {
  const backgroundColor = variant === 'light' ? appTheme.background : theme.colors.background;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor }, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
