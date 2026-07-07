import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { fontSizes, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { STUDIO_PLAYBACK_HEIGHT } from '../studio-layout';

export function PlaybackControls() {
  const clips = useEditorStore((s) => s.clips);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  return (
    <View style={styles.bar}>
      <Pressable style={styles.sideBtn} accessibilityLabel="Expand preview">
        <AppSymbol name="expand" size={20} tintColor={editorTheme.textSecondary} />
      </Pressable>

      <Pressable
        style={styles.playBtn}
        onPress={() => setPlaying(!isPlaying)}
        disabled={clips.length === 0}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        <AppSymbol
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          tintColor={editorTheme.text}
        />
      </Pressable>

      <View style={styles.rightCluster}>
        <View style={styles.sideBtn}>
          <AppSymbol name="layers" size={20} tintColor={editorTheme.textSecondary} />
          <Text style={styles.badge}>ON</Text>
        </View>
        <Pressable style={styles.sideBtn} disabled accessibilityLabel="Undo">
          <AppSymbol name="undo" size={20} tintColor={editorTheme.textMuted} />
        </Pressable>
        <Pressable style={styles.sideBtn} disabled accessibilityLabel="Redo">
          <AppSymbol name="redo" size={20} tintColor={editorTheme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: STUDIO_PLAYBACK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: editorTheme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: editorTheme.border,
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 2,
    color: editorTheme.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
});
