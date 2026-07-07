import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fontSizes, spacing, theme } from '@/constants';

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: theme.colors.danger,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
  },
});
