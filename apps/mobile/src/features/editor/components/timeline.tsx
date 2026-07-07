import React, { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { VideoThumbnail } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { fontSizes, radius, theme } from '@/constants';
import { useEditorStore } from '../editor-store';
import { clipDuration, EditorClip } from '../types';

const TRACK_HEIGHT = 56;
const WAVE_HEIGHT = 22;

interface TimelineCell {
  key: string;
  clip: EditorClip;
  clipIndex: number;
  /** Cell start, seconds from the start of this clip (trimmed space). */
  clipTime: number;
  /** Cell width in px (last cell of a clip may be partial). */
  width: number;
  isClipStart: boolean;
}

interface TimelineProps {
  thumbnails: Record<string, VideoThumbnail[]>;
}

/**
 * Multi-track timeline. One horizontal FlashList is the scroller — cells are
 * recycled aggressively so hour-long filmstrips don't exhaust memory. Scroll
 * position <-> playhead are two views of the same value; pinch zooms by
 * changing pixels-per-second.
 */
export function Timeline({ thumbnails }: TimelineProps) {
  const { width: screenWidth } = useWindowDimensions();
  const clips = useEditorStore((s) => s.clips);
  const pxPerSecond = useEditorStore((s) => s.pxPerSecond);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const selectClip = useEditorStore((s) => s.selectClip);
  const setPxPerSecond = useEditorStore((s) => s.setPxPerSecond);

  const listRef = useRef<FlashListRef<TimelineCell>>(null);
  const isUserScrolling = useRef(false);
  const pinchBase = useRef(pxPerSecond);
  const [, setZoomTick] = useState(0);

  const cellWidth = 56;
  const sidePad = screenWidth / 2;

  const cells = useMemo(() => {
    const result: TimelineCell[] = [];
    const cellSeconds = cellWidth / pxPerSecond;
    clips.forEach((clip, clipIndex) => {
      const duration = clipDuration(clip);
      const count = Math.max(1, Math.ceil(duration / cellSeconds));
      for (let i = 0; i < count; i++) {
        const start = i * cellSeconds;
        const remaining = duration - start;
        result.push({
          key: `${clip.id}:${i}`,
          clip,
          clipIndex,
          clipTime: start,
          width: Math.max(6, Math.min(cellWidth, remaining * pxPerSecond)),
          isClipStart: i === 0,
        });
      }
    });
    return result;
  }, [clips, pxPerSecond]);

  // While playing, follow the playhead; while the user drags, the scroll is
  // the source of truth instead.
  React.useEffect(() => {
    if (!isUserScrolling.current) {
      listRef.current?.scrollToOffset({ offset: playhead * pxPerSecond, animated: false });
    }
  }, [playhead, pxPerSecond]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isUserScrolling.current) return;
    setPlayhead(e.nativeEvent.contentOffset.x / pxPerSecond);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      runOnJS(capturePinchBase)();
    })
    .onEnd((e) => {
      runOnJS(commitZoom)(e.scale);
    });

  function capturePinchBase() {
    pinchBase.current = pxPerSecond;
  }
  function commitZoom(scale: number) {
    setPxPerSecond(pinchBase.current * scale);
    setZoomTick((t) => t + 1);
  }

  if (clips.length === 0) {
    return (
      <View style={[styles.empty, { height: TRACK_HEIGHT + WAVE_HEIGHT + 36 }]}>
        <Text style={styles.emptyText}>Import a video to start editing</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pinch}>
      <View>
        <TimeRuler pxPerSecond={pxPerSecond} clips={clips} sidePad={sidePad} playhead={playhead} />
        <View style={{ height: TRACK_HEIGHT + WAVE_HEIGHT }}>
          <FlashList
            ref={listRef}
            data={cells}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              isUserScrolling.current = true;
              if (isPlaying) setPlaying(false);
            }}
            onMomentumScrollEnd={() => {
              isUserScrolling.current = false;
            }}
            onScrollEndDrag={() => {
              // Momentum may still follow; FlashList fires momentum-end after.
              setTimeout(() => {
                isUserScrolling.current = false;
              }, 400);
            }}
            ListHeaderComponent={<View style={{ width: sidePad }} />}
            ListFooterComponent={<View style={{ width: sidePad }} />}
            renderItem={({ item }) => (
              <Cell
                cell={item}
                pxPerSecond={pxPerSecond}
                thumbnails={thumbnails[item.clip.uri]}
                selected={item.clip.id === selectedClipId}
                onSelect={() => selectClip(item.clip.id)}
              />
            )}
          />
          {/* Fixed center playhead */}
          <View pointerEvents="none" style={[styles.playhead, { left: screenWidth / 2 - 1 }]} />
        </View>
      </View>
    </GestureDetector>
  );
}

function Cell({
  cell,
  pxPerSecond,
  thumbnails,
  selected,
  onSelect,
}: {
  cell: TimelineCell;
  pxPerSecond: number;
  thumbnails: VideoThumbnail[] | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const { clip } = cell;
  // Map this cell's trimmed-timeline time back to source time for the thumb.
  const sourceTime = clip.trimStart + cell.clipTime;
  const thumb =
    thumbnails && thumbnails.length > 0
      ? thumbnails[
          Math.min(
            thumbnails.length - 1,
            Math.round((sourceTime / Math.max(0.001, clip.sourceDuration)) * (thumbnails.length - 1)),
          )
        ]
      : null;

  const waveBars = useMemo(() => {
    if (clip.waveform.length === 0) return [];
    const barCount = Math.max(2, Math.floor(cell.width / 3));
    const cellSeconds = cell.width / pxPerSecond;
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = sourceTime + (i / barCount) * cellSeconds;
      const idx = Math.min(
        clip.waveform.length - 1,
        Math.floor((t / Math.max(0.001, clip.sourceDuration)) * clip.waveform.length),
      );
      bars.push(clip.waveform[idx]);
    }
    return bars;
  }, [clip, cell.width, pxPerSecond, sourceTime]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onSelect}>
      <View
        style={[
          styles.cell,
          { width: cell.width },
          cell.isClipStart && styles.cellClipStart,
          selected && styles.cellSelected,
        ]}
      >
        {thumb ? (
          <Image source={thumb} style={styles.thumb} contentFit="cover" recyclingKey={cell.key} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.waveRow}>
          {waveBars.map((v, i) => (
            <View
              key={i}
              style={[styles.waveBar, { height: Math.max(2, v * WAVE_HEIGHT) }]}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TimeRuler({
  pxPerSecond,
  clips,
  sidePad,
  playhead,
}: {
  pxPerSecond: number;
  clips: EditorClip[];
  sidePad: number;
  playhead: number;
}) {
  const total = clips.reduce((sum, c) => sum + clipDuration(c), 0);
  const format = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  return (
    <View style={styles.ruler}>
      <Text style={styles.rulerText}>
        {format(playhead)} / {format(total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: fontSizes.sm,
  },
  ruler: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  rulerText: {
    color: theme.colors.textSecondary,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  cell: {
    height: TRACK_HEIGHT + WAVE_HEIGHT,
  },
  cellClipStart: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent,
  },
  cellSelected: {
    opacity: 0.85,
  },
  thumb: {
    height: TRACK_HEIGHT,
    width: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: theme.colors.surface,
  },
  waveRow: {
    height: WAVE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 1,
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  waveBar: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: 1,
    opacity: 0.8,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
});
