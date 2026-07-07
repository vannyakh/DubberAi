import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import {
  aspectBoxSize,
  CANVAS_ASPECT_PRESETS,
  resolveCanvasAspectRatio,
} from '../aspect-ratios';
import { useEditorStore } from '../editor-store';

export function RatioPanel() {
  const clips = useEditorStore((s) => s.clips);
  const canvasAspectId = useEditorStore((s) => s.canvasAspectId);
  const setCanvasAspectId = useEditorStore((s) => s.setCanvasAspectId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CANVAS_ASPECT_PRESETS.map((preset) => {
        const selected = canvasAspectId === preset.id;
        const ratio =
          preset.ratio ?? resolveCanvasAspectRatio(clips, 'original');
        const box = aspectBoxSize(ratio);

        return (
          <Pressable
            key={preset.id}
            style={styles.item}
            onPress={() => setCanvasAspectId(preset.id)}
            accessibilityState={{ selected }}
          >
            <View style={[styles.tile, selected && styles.tileSelected]}>
              {preset.id === 'original' ? (
                <AppSymbol name="aspectOriginal" size={18} tintColor={editorTheme.text} />
              ) : (
                <View
                  style={[
                    styles.ratioBox,
                    { width: box.width, height: box.height },
                  ]}
                />
              )}
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>{preset.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: 52,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: editorTheme.text,
  },
  ratioBox: {
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: editorTheme.textSecondary,
    backgroundColor: editorTheme.surface,
  },
  label: {
    color: editorTheme.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  labelSelected: {
    color: editorTheme.text,
    fontWeight: '700',
  },
});
