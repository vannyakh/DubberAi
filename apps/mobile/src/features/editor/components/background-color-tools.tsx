import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { CANVAS_BACKGROUND_PRESETS } from '../aspect-ratios';
import { useEditorStore } from '../editor-store';

const TILE = 64;
const COLOR_PRESETS = CANVAS_BACKGROUND_PRESETS.filter((p) => p.id !== 'blur');

export function BackgroundColorTools() {
  const canvasBackground = useEditorStore((s) => s.canvasBackground);
  const canvasBackgroundMode = useEditorStore((s) => s.canvasBackgroundMode);
  const setCanvasBackgroundSolid = useEditorStore((s) => s.setCanvasBackgroundSolid);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {COLOR_PRESETS.map((preset) => {
        const selected =
          canvasBackgroundMode === 'solid' && canvasBackground === preset.color;
        return (
          <Pressable
            key={preset.id}
            style={styles.item}
            onPress={() => setCanvasBackgroundSolid(preset.color)}
            accessibilityState={{ selected }}
          >
            <View style={[styles.tile, selected && styles.tileSelected]}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: preset.color },
                  preset.id === 'black' && styles.swatchBorder,
                ]}
              />
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
    gap: spacing.lg,
    alignItems: 'flex-end',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: TILE,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: editorTheme.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: editorTheme.text,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: editorTheme.border,
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
