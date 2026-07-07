import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSymbol } from '@/components';
import { editorTheme } from '@/constants/editor-theme';
import { STUDIO_LANE_GAP, STUDIO_SIDEBAR_WIDTH } from '../studio-layout';
import { TimelineTrackRow } from '../timeline-tracks';

interface Props {
  tracks: TimelineTrackRow[];
  contentHeight: number;
  muted: boolean;
  canMute: boolean;
  onToggleMute: () => void;
  onImport: () => void;
  onAddText: () => void;
}

export function TimelineSidebar({
  tracks,
  contentHeight,
  muted,
  canMute,
  onToggleMute,
  onImport,
  onAddText,
}: Props) {
  return (
    <View style={[styles.col, { height: contentHeight }]}>
      {tracks.map((track, index) => (
        <React.Fragment key={track.id}>
          {index > 0 ? <View style={styles.gap} /> : null}
          <TrackSidebarRow
            track={track}
            muted={muted}
            canMute={canMute}
            onToggleMute={onToggleMute}
            onImport={onImport}
            onAddText={onAddText}
          />
        </React.Fragment>
      ))}
    </View>
  );
}

function TrackSidebarRow({
  track,
  muted,
  canMute,
  onToggleMute,
  onImport,
  onAddText,
}: {
  track: TimelineTrackRow;
  muted: boolean;
  canMute: boolean;
  onToggleMute: () => void;
  onImport: () => void;
  onAddText: () => void;
}) {
  if (track.kind === 'video') {
    return (
      <View style={[styles.row, { height: track.height }]}>
        <Pressable
          style={[styles.muteChip, !canMute && styles.disabled]}
          onPress={onToggleMute}
          disabled={!canMute}
          accessibilityLabel={muted ? 'Unmute clip audio' : 'Mute clip audio'}
        >
          <AppSymbol
            name={muted ? 'volumeMuted' : 'volume'}
            size={13}
            tintColor={canMute ? editorTheme.text : editorTheme.textMuted}
          />
          <Text style={styles.muteText} numberOfLines={2}>
            {muted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (track.kind === 'audio') {
    return (
      <Pressable
        style={[styles.iconRow, { height: track.height }]}
        onPress={onImport}
        accessibilityLabel="Audio track"
      >
        <AppSymbol name="music" size={16} tintColor={editorTheme.textSecondary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.iconRow, { height: track.height }]}
      onPress={onAddText}
      accessibilityLabel="Text track"
    >
      <AppSymbol name="text" size={16} tintColor={editorTheme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  col: {
    width: STUDIO_SIDEBAR_WIDTH,
    backgroundColor: editorTheme.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: editorTheme.border,
  },
  row: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    justifyContent: 'center',
  },
  muteChip: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: editorTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  muteText: {
    color: editorTheme.textMuted,
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 9,
  },
  gap: {
    height: STUDIO_LANE_GAP,
  },
  iconRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
