import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppSymbol, Screen, SymbolName } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { fontSizes, radius, spacing } from '@/constants';
import { useAppStore, useAuthStore } from '@/stores';

interface SettingsRowProps {
  symbol: SymbolName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingsRow({ symbol, title, subtitle, onPress, destructive }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <AppSymbol
          name={symbol}
          size={18}
          tintColor={destructive ? appTheme.danger : appTheme.text}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {onPress ? (
        <AppSymbol name="chevronRight" size={18} tintColor={appTheme.textMuted} />
      ) : null}
    </Pressable>
  );
}

export function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const mode = useAppStore((s) => s.mode);
  const resetMode = useAppStore((s) => s.resetMode);

  const isLocal = mode === 'local';
  const isCloud = mode === 'cloud' && !!user;
  const displayName = user?.email?.split('@')[0] ?? 'Creator';
  const initials = displayName.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await logout();
    await resetMode();
    router.replace('/login');
  };

  return (
    <Screen variant="light">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{isCloud ? displayName : 'Local creator'}</Text>
          <Text style={styles.email}>{isCloud ? user?.email : 'Projects saved on this device'}</Text>
          <View style={[styles.modeBadge, isLocal ? styles.modeLocal : styles.modeCloud]}>
            <Text style={styles.modeBadgeText}>{isLocal ? 'On device' : 'Cloud sync'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          {isCloud ? (
            <SettingsRow symbol="email" title="Email" subtitle={user?.email} />
          ) : (
            <SettingsRow
              symbol="cloud"
              title="Sign in to sync"
              subtitle="Unlock AI translation and cloud backup"
              onPress={() => router.push('/login')}
            />
          )}
          <SettingsRow
            symbol="storage"
            title="Storage mode"
            subtitle={
              isLocal
                ? 'Projects stay on this device only'
                : 'Projects sync across your devices'
            }
          />
        </View>

        <Text style={styles.sectionLabel}>Editor</Text>
        <View style={styles.group}>
          <SettingsRow
            symbol="editor"
            title="Video editor"
            subtitle="Runs locally — export saves to your photo library"
          />
          <SettingsRow
            symbol="translate"
            title="AI translation"
            subtitle={isLocal ? 'Requires cloud account' : 'Available on your projects'}
          />
        </View>

        {isCloud ? (
          <>
            <Text style={styles.sectionLabel}>Session</Text>
            <View style={styles.group}>
              <SettingsRow symbol="logout" title="Sign out" onPress={signOut} destructive />
            </View>
          </>
        ) : (
          <Pressable onPress={() => router.push('/login')} style={styles.signInBanner}>
            <Text style={styles.signInBannerTitle}>Already have an account?</Text>
            <Text style={styles.signInBannerAction}>Sign in</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profile: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: appTheme.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: appTheme.accent,
    fontWeight: '800',
    fontSize: fontSizes.lg,
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: appTheme.text,
  },
  email: {
    fontSize: fontSizes.sm,
    color: appTheme.textSecondary,
    marginTop: spacing.xs,
  },
  modeBadge: {
    marginTop: spacing.md,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  modeLocal: {
    backgroundColor: appTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: appTheme.border,
  },
  modeCloud: {
    backgroundColor: appTheme.accent + '55',
  },
  modeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: appTheme.text,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: appTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: {
    backgroundColor: appTheme.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: appTheme.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appTheme.border,
  },
  rowPressed: {
    backgroundColor: appTheme.surfaceMuted,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: appTheme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowIconDanger: {
    backgroundColor: '#FFECEC',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: appTheme.text,
  },
  rowTitleDanger: {
    color: appTheme.danger,
  },
  rowSubtitle: {
    fontSize: fontSizes.xs,
    color: appTheme.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  signInBanner: {
    backgroundColor: appTheme.dark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signInBannerTitle: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  signInBannerAction: {
    color: appTheme.accent,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
