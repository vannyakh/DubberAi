import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fontSizes, spacing, theme } from '@/constants';
import { useEditorStore } from '../editor-store';
import { clipAtTime } from '../types';
import { GlassPanel } from './glass-panel';

interface ToolbarProps {
  onImport: () => void;
  onAddText: () => void;
}

/** Bottom glass toolbar with clip operations acting at the playhead. */
export function Toolbar({ onImport, onAddText }: ToolbarProps) {
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const splitClipAt = useEditorStore((s) => s.splitClipAt);
  const trimClip = useEditorStore((s) => s.trimClip);
  const removeClip = useEditorStore((s) => s.removeClip);

  const selected = clips.find((c) => c.id === selectedClipId) ?? null;

  const trimAtPlayhead = (edge: 'in' | 'out') => {
    if (!selected) return;
    const segment = clipAtTime(clips, playhead);
    if (!segment || segment.clip.id !== selected.id) return;
    const sourceTime = selected.trimStart + segment.localTime;
    if (edge === 'in') trimClip(selected.id, sourceTime, selected.trimEnd);
    else trimClip(selected.id, selected.trimStart, sourceTime);
  };

  const tools = [
    { label: 'Add', onPress: onImport, disabled: false },
    { label: 'Split', onPress: () => splitClipAt(playhead), disabled: clips.length === 0 },
    { label: 'Trim in', onPress: () => trimAtPlayhead('in'), disabled: !selected },
    { label: 'Trim out', onPress: () => trimAtPlayhead('out'), disabled: !selected },
    { label: 'Text', onPress: onAddText, disabled: clips.length === 0 },
    {
      label: 'Delete',
      onPress: () => selected && removeClip(selected.id),
      disabled: !selected,
      danger: true,
    },
  ];

  return (
    <GlassPanel style={styles.panel}>
      <View style={styles.row}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.label}
            onPress={tool.onPress}
            disabled={tool.disabled}
            style={[styles.tool, tool.disabled && styles.toolDisabled]}
          >
            <Text
              style={[
                styles.toolText,
                tool.danger && !tool.disabled && { color: theme.colors.danger },
              ]}
            >
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  tool: {
    paddingHorizontal: spacing.sm,
  },
  toolDisabled: {
    opacity: 0.35,
  },
  toolText: {
    color: theme.colors.textPrimary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
});
