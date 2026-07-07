import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { fontSizes, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';

interface EditorEditPanelProps {
  title: string;
  onDone: () => void;
  children: React.ReactNode;
}

/** In-editor bottom panel that replaces the timeline while an option is open. */
export function EditorEditPanel({ title, onDone, children }: EditorEditPanelProps) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          style={styles.doneBtn}
          onPress={onDone}
          accessibilityLabel="Done"
          hitSlop={8}
        >
          <AppSymbol name="checkmark" size={20} tintColor={editorTheme.accent} />
        </Pressable>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: editorTheme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: editorTheme.border,
  },
  header: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: editorTheme.border,
  },
  title: {
    color: editorTheme.text,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  doneBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
