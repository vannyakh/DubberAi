import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fontSizes, radius, spacing, theme } from '@/constants';
import { useEditorStore } from '../editor-store';
import { FILTER_PRESETS } from '../types';

/** Horizontal chip row of color-grade presets, GPU-previewed by Skia. */
export function FilterBar() {
  const filterId = useEditorStore((s) => s.filterId);
  const setFilter = useEditorStore((s) => s.setFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTER_PRESETS.map((preset) => (
        <TouchableOpacity
          key={preset.id}
          style={[styles.chip, filterId === preset.id && styles.chipActive]}
          onPress={() => setFilter(preset.id)}
        >
          <Text style={[styles.chipText, filterId === preset.id && styles.chipTextActive]}>
            {preset.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(45,212,191,0.16)',
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: fontSizes.xs,
  },
  chipTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
