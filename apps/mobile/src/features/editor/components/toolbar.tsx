import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSymbol, SymbolName } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { STUDIO_TOOLBAR_HEIGHT, STUDIO_TOOLBAR_ITEM_MIN_WIDTH } from '../studio-layout';
import type { EditorEditingPanel } from '../editing-panel';

interface ToolbarProps {
  onImport: () => void;
  onAddText: () => void;
  activePanel: EditorEditingPanel | null;
  onOpenPanel: (panel: EditorEditingPanel) => void;
}

interface ToolItem {
  id: string;
  symbol: SymbolName;
  label: string;
  panel?: EditorEditingPanel;
  onPress?: () => void;
  disabled?: boolean;
}

/** Main CapCut-style tool strip — shown when no clip is selected. */
export function Toolbar({ onImport, onAddText, activePanel, onOpenPanel }: ToolbarProps) {
  const clips = useEditorStore((s) => s.clips);
  const hasClips = clips.length > 0;

  const tools: ToolItem[] = [
    { id: 'edit', symbol: 'scissors', label: 'Edit', disabled: true },
    { id: 'audio', symbol: 'music', label: 'Audio', onPress: onImport },
    { id: 'text', symbol: 'text', label: 'Text', onPress: onAddText, disabled: !hasClips },
    { id: 'effects', symbol: 'effects', label: 'Effects', disabled: true },
    { id: 'overlay', symbol: 'overlay', label: 'Overlay', onPress: onImport, disabled: !hasClips },
    { id: 'captions', symbol: 'captions', label: 'Captions', disabled: true },
    { id: 'filters', symbol: 'filters', label: 'Filters', panel: 'filters', disabled: !hasClips },
    { id: 'adjust', symbol: 'adjust', label: 'Adjust', disabled: true },
    {
      id: 'ratio',
      symbol: 'aspectRatio',
      label: 'Ratio',
      panel: 'ratio',
      disabled: !hasClips,
    },
    {
      id: 'background',
      symbol: 'backgroundBlur',
      label: 'Background',
      panel: 'background',
      disabled: !hasClips,
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
        {tools.map((tool) => {
          const active = tool.panel ? activePanel === tool.panel : false;
          const onPress = tool.panel
            ? () => onOpenPanel(tool.panel!)
            : tool.onPress;

          return (
            <TouchableOpacity
              key={tool.id}
              style={[styles.item, tool.disabled && styles.itemDisabled]}
              onPress={onPress}
              disabled={tool.disabled || !onPress}
              accessibilityLabel={tool.label}
              accessibilityState={{ selected: active }}
            >
              <AppSymbol
                name={tool.symbol}
                size={22}
                tintColor={
                  active
                    ? editorTheme.accent
                    : tool.disabled
                      ? editorTheme.textMuted
                      : editorTheme.text
                }
              />
              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                  tool.disabled && styles.labelDisabled,
                ]}
                numberOfLines={1}
              >
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    minWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    color: editorTheme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
  },
  labelActive: {
    color: editorTheme.accent,
    fontWeight: '700',
  },
  labelDisabled: {
    color: editorTheme.textMuted,
  },
});
