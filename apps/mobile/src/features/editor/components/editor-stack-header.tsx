import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { STUDIO_HEADER_BAR_HEIGHT } from '../studio-layout';
import { EditorHeaderLeft } from './editor-header-left';
import { EditorHeaderRight } from './editor-header-right';

/** CapCut-style top bar — close + export, dark, full safe area. */
export function EditorStackHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <EditorHeaderLeft />
        <View style={styles.spacer} />
        <EditorHeaderRight />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: editorTheme.background,
  },
  row: {
    height: STUDIO_HEADER_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
});
