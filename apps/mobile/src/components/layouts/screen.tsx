import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { appTheme } from '@/constants/app-theme';
import { theme } from '@/constants';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Light home/account screens vs dark editor screens. */
  variant?: 'light' | 'dark';
  /** Safe area edges; defaults to top only. Use `[]` when a stack header owns the top inset. */
  edges?: Edge[];
}

/** SafeArea screen wrapper with the app background color. */
export function Screen({ children, style, variant = 'dark', edges = ['top'] }: Props) {
  const backgroundColor = variant === 'light' ? appTheme.background : theme.colors.background;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
