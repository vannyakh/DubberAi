import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSizes, radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorExport } from '../hooks/use-editor-export';

export function EditorHeaderRight() {
  const { startExport, canExport } = useEditorExport();

  return (
    <Pressable
      onPress={startExport}
      disabled={!canExport}
      hitSlop={8}
      style={[styles.exportBtn, !canExport && styles.exportBtnDisabled]}
      accessibilityLabel="Export video"
    >
      <Text style={styles.exportText}>Export</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  exportBtn: {
    backgroundColor: editorTheme.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnDisabled: {
    opacity: 0.4,
  },
  exportText: {
    color: editorTheme.accentText,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
});
