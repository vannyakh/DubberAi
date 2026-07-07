import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppSymbol } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, radius, spacing } from '@/constants';
import { useAppStore, useAuthStore } from '@/stores';

interface Props {
  onCreatePress?: () => void;
}

export function HomeHeader({ onCreatePress }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);

  const displayName = user?.email?.split('@')[0] ?? 'Creator';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Open account"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} onPress={onCreatePress} accessibilityLabel="New project">
            <AppSymbol name="add" size={22} tintColor={appTheme.text} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          >
            <AppSymbol name="menu" size={20} tintColor={appTheme.text} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.greeting}>Hello, {displayName}</Text>
      <Text style={styles.subtitle}>
        {mode === 'local'
          ? 'What would you like to edit today?'
          : 'Your projects sync across devices.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: appTheme.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: appTheme.accent,
    fontWeight: '800',
    fontSize: fontSizes.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: appTheme.surface,
    borderWidth: 1,
    borderColor: appTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: appTheme.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: appTheme.textSecondary,
    marginTop: spacing.xs,
  },
});
