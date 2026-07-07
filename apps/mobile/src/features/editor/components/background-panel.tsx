import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { CANVAS_BACKGROUND_PRESETS } from '../aspect-ratios';
import { useEditorStore } from '../editor-store';

export function BackgroundPanel() {
  const canvasBackground = useEditorStore((s) => s.canvasBackground);
  const setCanvasBackground = useEditorStore((s) => s.setCanvasBackground);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CANVAS_BACKGROUND_PRESETS.map((preset) => {
        const selected = canvasBackground === preset.color;
        return (
          <Pressable
            key={preset.id}
            style={styles.item}
            onPress={() => setCanvasBackground(preset.color)}
            accessibilityState={{ selected }}
          >
            <View style={[styles.tile, selected && styles.tileSelected]}>
              {preset.id === 'blur' ? (
                <AppSymbol name="backgroundBlur" size={22} tintColor={editorTheme.textSecondary} />
              ) : preset.id === 'white' ? (
                <View style={[styles.swatch, { backgroundColor: preset.color }]} />
              ) : (
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: preset.color },
                    preset.id === 'black' && styles.swatchBorder,
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
    gap: spacing.lg,
    alignItems: 'flex-end',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: 56,
  },
  tile: {
    width: 52,
    height: 52,
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
  swatch: {
    width: 28,
    height: 28,
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
