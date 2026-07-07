import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSymbol, SymbolName } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { STUDIO_TOOLBAR_HEIGHT, STUDIO_TOOLBAR_ITEM_MIN_WIDTH } from '../studio-layout';

interface OverlayToolsBarProps {
  onReplace: () => void;
  onDeselect: () => void;
}

interface ToolItem {
  id: string;
  symbol: SymbolName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Contextual tools when a media overlay is selected. */
export function OverlayToolsBar({ onReplace, onDeselect }: OverlayToolsBarProps) {
  const selectedMediaOverlayId = useEditorStore((s) => s.selectedMediaOverlayId);
  const removeMediaOverlay = useEditorStore((s) => s.removeMediaOverlay);

  if (!selectedMediaOverlayId) return null;

  const tools: ToolItem[] = [
    {
      id: 'replace',
      symbol: 'overlay',
      label: 'Replace',
      onPress: onReplace,
    },
    {
      id: 'delete',
      symbol: 'delete',
      label: 'Delete',
      onPress: () => {
        removeMediaOverlay(selectedMediaOverlayId);
        onDeselect();
      },
    },
  ];

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onDeselect}
        accessibilityLabel="Back to tools"
      >
        <AppSymbol name="back" size={22} tintColor={editorTheme.text} />
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        directionalLockEnabled
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.item}
            onPress={tool.onPress}
            disabled={tool.disabled}
            accessibilityLabel={tool.label}
          >
            <AppSymbol
              name={tool.symbol}
              size={22}
              tintColor={tool.id === 'delete' ? editorTheme.danger : editorTheme.text}
            />
            <Text
              style={[styles.label, tool.id === 'delete' && styles.labelDanger]}
              numberOfLines={1}
            >
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: STUDIO_TOOLBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorTheme.border,
    backgroundColor: editorTheme.surface,
  },
  backBtn: {
    width: 44,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: editorTheme.border,
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    height: STUDIO_TOOLBAR_HEIGHT,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  item: {
    minWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  label: {
    color: editorTheme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
  },
  labelDanger: {
    color: editorTheme.danger,
    fontWeight: '700',
  },
});
