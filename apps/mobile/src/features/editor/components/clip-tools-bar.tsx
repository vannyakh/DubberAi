import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSymbol, SymbolName } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { clipDuration, clipTimelineStart } from '../types';
import { STUDIO_TOOLBAR_HEIGHT } from '../studio-layout';
import type { EditorEditingPanel } from '../editing-panel';

interface ClipToolsBarProps {
  activePanel: EditorEditingPanel | null;
  onOpenPanel: (panel: EditorEditingPanel) => void;
  onDeselect: () => void;
}

interface ToolItem {
  id: string;
  symbol: SymbolName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

/** Contextual clip tools — shown when a timeline clip is selected. */
export function ClipToolsBar({ activePanel, onOpenPanel, onDeselect }: ClipToolsBarProps) {
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const playhead = useEditorStore((s) => s.playhead);
  const splitClipAt = useEditorStore((s) => s.splitClipAt);
  const removeClip = useEditorStore((s) => s.removeClip);
  const toggleClipMuted = useEditorStore((s) => s.toggleClipMuted);
  const trimSelectedAtPlayhead = useEditorStore((s) => s.trimSelectedAtPlayhead);

  const clip = clips.find((c) => c.id === selectedClipId);
  if (!clip || !selectedClipId) return null;

  const clipStart = clipTimelineStart(clips, selectedClipId);
  const clipEnd = clipStart + clipDuration(clip);
  const playheadInClip = playhead > clipStart + 0.05 && playhead < clipEnd - 0.05;

  const tools: ToolItem[] = [
    {
      id: 'split',
      symbol: 'scissors',
      label: 'Split',
      onPress: () => splitClipAt(playhead),
      disabled: !playheadInClip,
    },
    {
      id: 'volume',
      symbol: clip.muted ? 'volumeMuted' : 'volume',
      label: 'Volume',
      onPress: () => toggleClipMuted(selectedClipId),
      disabled: !clip.hasAudio,
      active: clip.muted,
    },
    {
      id: 'trim-in',
      symbol: 'chevronLeft',
      label: 'Trim in',
      onPress: () => trimSelectedAtPlayhead('in'),
      disabled: !playheadInClip,
    },
    {
      id: 'trim-out',
      symbol: 'chevronRight',
      label: 'Trim out',
      onPress: () => trimSelectedAtPlayhead('out'),
      disabled: !playheadInClip,
    },
    {
      id: 'filters',
      symbol: 'filters',
      label: 'Filters',
      onPress: () => onOpenPanel('filters'),
      active: activePanel === 'filters',
    },
    {
      id: 'ratio',
      symbol: 'aspectRatio',
      label: 'Ratio',
      onPress: () => onOpenPanel('ratio'),
      active: activePanel === 'ratio',
    },
    {
      id: 'effects',
      symbol: 'effects',
      label: 'Effects',
      onPress: () => {},
      disabled: true,
    },
    {
      id: 'delete',
      symbol: 'delete',
      label: 'Delete',
      onPress: () => {
        removeClip(selectedClipId);
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
                tool.id === 'delete'
                  ? editorTheme.danger
                  : tool.active
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
                tool.id === 'delete' && styles.labelDanger,
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
  labelDanger: {
    color: editorTheme.danger,
  },
});
