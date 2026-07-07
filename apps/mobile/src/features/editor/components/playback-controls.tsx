import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppSymbol } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useEditorStore } from '../editor-store';
import { STUDIO_PLAYBACK_HEIGHT } from '../studio-layout';

interface Props {
  onImport: () => void;
}

export function PlaybackControls({ onImport }: Props) {
  const clips = useEditorStore((s) => s.clips);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  return (
    <View style={styles.bar}>
      <Pressable
        style={styles.sideBtn}
        onPress={onImport}
        accessibilityLabel="Add media"
      >
        <AppSymbol name="add" size={22} tintColor={editorTheme.text} />
      </Pressable>

      <Pressable
        style={styles.playBtn}
        onPress={() => setPlaying(!isPlaying)}
        disabled={clips.length === 0}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        <AppSymbol
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          tintColor={editorTheme.text}
        />
      </Pressable>

      <View style={styles.sideBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: STUDIO_PLAYBACK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: editorTheme.background,
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: editorTheme.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
