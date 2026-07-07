import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fontSizes, radius } from '@/constants';
import { appTheme } from '@/constants/app-theme';
import { useAuthStore } from '@/stores';

export function HomeHeaderLeft() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const displayName = user?.email?.split('@')[0] ?? 'Creator';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={styles.hitArea}
      onPress={() => router.push('/settings')}
      accessibilityLabel="Open account"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: appTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: appTheme.accent,
    fontWeight: '800',
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
  },
});
