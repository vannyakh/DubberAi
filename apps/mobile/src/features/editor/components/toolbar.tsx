import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSymbol, SymbolName } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { STUDIO_TOOLBAR_HEIGHT } from '../studio-layout';
import type { EditorEditingPanel } from '../editing-panel';

interface ToolbarProps {
  onImport: () => void;
  onAddText: () => void;
  activePanel: EditorEditingPanel | null;
  onOpenFilters: () => void;
}

interface ToolItem {
  id: string;
  symbol: SymbolName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

/** Main CapCut-style tool strip — shown when no clip is selected. */
export function Toolbar({ onImport, onAddText, activePanel, onOpenFilters }: ToolbarProps) {
  const clips = useEditorStore((s) => s.clips);

  const tools: ToolItem[] = [
    {
      id: 'filters',
      symbol: 'filters',
      label: 'Filters',
      onPress: onOpenFilters,
      active: activePanel === 'filters',
      disabled: clips.length === 0,
    },
    {
      id: 'adjust',
      symbol: 'adjust',
      label: 'Adjust',
      onPress: () => {},
      disabled: true,
    },
    {
      id: 'audio',
      symbol: 'music',
      label: 'Audio',
      onPress: onImport,
    },
    {
      id: 'text',
      symbol: 'text',
      label: 'Text',
      onPress: onAddText,
      disabled: clips.length === 0,
    },
    {
      id: 'effects',
      symbol: 'effects',
      label: 'Effects',
      onPress: () => {},
      disabled: true,
    },
    {
      id: 'overlay',
      symbol: 'overlay',
      label: 'Overlay',
      onPress: onImport,
      disabled: clips.length === 0,
    },
    {
      id: 'captions',
      symbol: 'captions',
      label: 'Captions',
      onPress: () => {},
      disabled: true,
    },
  ];

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        directionalLockEnabled
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.item, tool.disabled && styles.itemDisabled]}
            onPress={tool.onPress}
            disabled={tool.disabled}
            accessibilityLabel={tool.label}
            accessibilityState={{ selected: tool.active }}
          >
            <AppSymbol
              name={tool.symbol}
              size={22}
              tintColor={
                tool.active
                  ? editorTheme.accent
                  : tool.disabled
                    ? editorTheme.textMuted
                    : editorTheme.text
              }
            />
            <Text
              style={[
                styles.label,
                tool.active && styles.labelActive,
                tool.disabled && styles.labelDisabled,
              ]}
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
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorTheme.border,
    backgroundColor: editorTheme.surface,
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
    width: 56,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    color: editorTheme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: editorTheme.accent,
    fontWeight: '700',
  },
  labelDisabled: {
    color: editorTheme.textMuted,
  },
});
