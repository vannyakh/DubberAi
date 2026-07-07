import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppSymbol } from '@/components';
import { editorTheme } from '@/constants/editor-theme';

export function EditorHeaderLeft() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.btn}
      accessibilityLabel="Close editor"
    >
      <AppSymbol name="close" size={22} tintColor={editorTheme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
