import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** SafeArea screen wrapper with the app background color. */
export function Screen({ children, style }: Props) {
  return <SafeAreaView style={[styles.root, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
