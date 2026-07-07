import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { FILTER_PRESETS, FilterId, FilterPreset } from '../types';

const GRID_COLUMNS = 4;
const GRID_GAP = spacing.sm;

function pillFill(preset: FilterPreset) {
  if (preset.id === 'none') return editorTheme.surfaceRaised;
  if (preset.id === 'warm') return 'rgba(255,140,50,0.5)';
  if (preset.id === 'cool') return 'rgba(60,140,255,0.5)';
  if (preset.id === 'mono') return 'rgba(140,140,150,0.55)';
  if (preset.id === 'fade') return 'rgba(210,200,185,0.5)';
  return 'rgba(200,120,255,0.45)';
}

interface FiltersPanelProps {
  /** When set, presets apply to this clip; otherwise the global timeline filter. */
  clipId?: string | null;
}

export function FiltersPanel({ clipId = null }: FiltersPanelProps) {
  const { width: screenWidth } = useWindowDimensions();
  const globalFilterId = useEditorStore((s) => s.filterId);
  const setFilter = useEditorStore((s) => s.setFilter);
  const setClipFilter = useEditorStore((s) => s.setClipFilter);
  const clips = useEditorStore((s) => s.clips);

  const clip = clipId ? clips.find((c) => c.id === clipId) : null;
  const activeFilterId: FilterId = clip ? clip.filterId : globalFilterId;

  const cellSize = useMemo(() => {
    const gridWidth = screenWidth - spacing.lg * 2;
    return (gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  }, [screenWidth]);

  const applyFilter = (id: FilterId) => {
    if (clip) setClipFilter(clip.id, id);
    else setFilter(id);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {FILTER_PRESETS.map((preset, index) => {
        const active = activeFilterId === preset.id;
        const marginRight = index % GRID_COLUMNS < GRID_COLUMNS - 1 ? GRID_GAP : 0;

        return (
          <TouchableOpacity
            key={preset.id}
            style={[styles.cell, { width: cellSize, marginRight }]}
            onPress={() => applyFilter(preset.id)}
            accessibilityLabel={`${preset.label} filter`}
            accessibilityState={{ selected: active }}
          >
            <View
              style={[
                styles.preview,
                { height: cellSize, backgroundColor: pillFill(preset) },
                active && styles.previewActive,
              ]}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  cell: {
    marginBottom: GRID_GAP,
    alignItems: 'center',
    gap: 4,
  },
  preview: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: editorTheme.border,
  },
  previewActive: {
    borderColor: editorTheme.accent,
  },
  label: {
    color: editorTheme.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: {
    color: editorTheme.accent,
    fontWeight: '700',
  },
});
