import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { authTheme } from '@/constants/auth-theme';
import { fontSizes, spacing } from '@/constants';

type Variant = 'dark' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AuthProviderButton({
  label,
  onPress,
  icon,
  variant = 'outline',
  loading,
  disabled,
  style,
}: Props) {
  const isDark = variant === 'dark';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDark ? styles.dark : styles.outline,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      {loading ? (
        <ActivityIndicator color={isDark ? authTheme.buttonDarkText : authTheme.text} />
      ) : (
        <Text style={[styles.label, isDark ? styles.darkLabel : styles.outlineLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: authTheme.pillRadius,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    minHeight: 52,
  },
  dark: {
    backgroundColor: authTheme.buttonDark,
  },
  outline: {
    backgroundColor: authTheme.backgroundLight,
    borderWidth: 1,
    borderColor: authTheme.borderLight,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    position: 'absolute',
    left: spacing.lg,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  darkLabel: {
    color: authTheme.buttonDarkText,
  },
  outlineLabel: {
    color: authTheme.textDark,
  },
});
