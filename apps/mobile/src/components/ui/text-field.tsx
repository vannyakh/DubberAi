import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { fontSizes, radius, spacing, theme } from '@/constants';

export function TextField({ style, multiline, ...props }: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline, style]}
      placeholderTextColor={theme.colors.textMuted}
      multiline={multiline}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: theme.colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },
  multiline: {
    minHeight: 140,
    padding: spacing.md,
    fontSize: fontSizes.sm,
    textAlignVertical: 'top',
  },
});
