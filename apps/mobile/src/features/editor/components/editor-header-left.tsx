import React, { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppSymbol } from '@/components';
import { editorTheme } from '@/constants/editor-theme';
import { closeEditor } from '../editor-navigation';

export function EditorHeaderLeft() {
  const router = useRouter();

  const handleClose = useCallback(() => {
    closeEditor(router);
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  return (
    <Pressable
      onPress={handleClose}
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
