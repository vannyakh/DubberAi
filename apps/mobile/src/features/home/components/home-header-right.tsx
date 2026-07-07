import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppSymbol } from '@/components';
import { radius } from '@/constants';
import { appTheme } from '@/constants/app-theme';

export function HomeHeaderRight() {
  return (
    <Pressable
      style={styles.iconBtn}
      onPress={() => {}}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <AppSymbol name="notification" size={22} tintColor={appTheme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
