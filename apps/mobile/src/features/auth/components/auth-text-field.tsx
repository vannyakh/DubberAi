import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { authTheme } from '@/constants/auth-theme';
import { fontSizes, radius, spacing } from '@/constants';

interface Props extends TextInputProps {
  error?: string | null;
}

export function AuthTextField({ style, error, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={authTheme.textMuted}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: authTheme.inputBgLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: authTheme.borderLight,
    color: authTheme.textDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },
  inputError: {
    borderColor: authTheme.danger,
  },
  error: {
    color: authTheme.danger,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
