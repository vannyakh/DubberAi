import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Canvas, Line, Rect } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { VideoThumbnail } from 'expo-video';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { AppSymbol } from '@/components';
import { fontSizes, radius } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { useTimelineGestures } from '../hooks/use-timeline-gestures';
import {
  STUDIO_LANE_GAP,
  STUDIO_RULER_HEIGHT,
  STUDIO_SIDEBAR_WIDTH,
  STUDIO_TRACKS_VIEWPORT_HEIGHT,
  STUDIO_VIDEO_LANE_HEIGHT,
} from '../studio-layout';
import {
  computeTimelineTracks,
  overlaysForTextTrack,
  timelineTracksContentHeight,
  TimelineTrackRow,
} from '../timeline-tracks';
import {
  buildTimelineClipSegments,
  filmstripTileCount,
  formatTimelineTime,
  rulerTickStep,
  TIMELINE_ADD_ENDING_GAP,
  TIMELINE_ADD_ENDING_WIDTH,
  TIMELINE_CELL_WIDTH,
} from '../timeline-utils';
import { useClipDisplayUris } from '../hooks/use-clip-display-uri';
import { useEditorStore } from '../editor-store';
import { EditorClip, TextOverlay, timelineDuration } from '../types';
import { TimelineSidebar } from './timeline-sidebar';
import { TimelineWaveformCanvas } from './timeline-waveform-canvas';

interface TimelineProps {
  thumbnails: Record<string, VideoThumbnail[]>;
  onImport: () => void;
  onAddText: () => void;
}

export function Timeline({ thumbnails, onImport, onAddText }: TimelineProps) {
  const { width: screenWidth } = useWindowDimensions();
  const tracksWidth = screenWidth - STUDIO_SIDEBAR_WIDTH;

  const clips = useEditorStore((s) => s.clips);
  const overlays = useEditorStore((s) => s.overlays);
  const pxPerSecond = useEditorStore((s) => s.pxPerSecond);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setPxPerSecond = useEditorStore((s) => s.setPxPerSecond);
  const selectClip = useEditorStore((s) => s.selectClip);
  const toggleClipMuted = useEditorStore((s) => s.toggleClipMuted);

  const totalDuration = timelineDuration(clips);
  const timelineWidth = Math.max(tracksWidth, totalDuration * pxPerSecond);
  const contentWidth = timelineWidth + TIMELINE_ADD_ENDING_GAP + TIMELINE_ADD_ENDING_WIDTH;

  const { sidePad, gestures, contentShift } = useTimelineGestures({
    tracksWidth,
    totalDuration,
    pxPerSecond,
    playhead,
    isPlaying,
    setPlayhead,
    setPlaying,
    setPxPerSecond,
  });

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? clips[0] ?? null;

  const allSegments = useMemo(
    () => buildTimelineClipSegments(clips, pxPerSecond),
    [clips, pxPerSecond],
  );

  const displayUris = useClipDisplayUris(clips);

  const tickStep = rulerTickStep(pxPerSecond);
  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    const max = Math.max(totalDuration + tickStep, tickStep * 3);
    for (let t = 0; t <= max; t += tickStep) ticks.push(t);
    return ticks;
  }, [totalDuration, tickStep]);

  const trackRows = useMemo(() => computeTimelineTracks(overlays.length), [overlays.length]);
  const tracksContentHeight = useMemo(
    () => timelineTracksContentHeight(trackRows),
    [trackRows],
  );

  const hasClips = clips.length > 0;
  const [tracksViewportHeight, setTracksViewportHeight] = useState(0);
  const bodyHeight = Math.max(
    tracksContentHeight,
    tracksViewportHeight || STUDIO_TRACKS_VIEWPORT_HEIGHT,
  );

  return (
    <View style={styles.frame}>
      <View style={styles.rulerRow}>
        <Text style={styles.rulerClock}>
          {formatTimelineTime(playhead)} / {formatTimelineTime(totalDuration)}
        </Text>
        <View style={styles.rulerClip} pointerEvents="none">
          <Animated.View style={[styles.rulerShift, { width: contentWidth }, contentShift]}>
            <TimelineRulerCanvas
              width={contentWidth}
              height={STUDIO_RULER_HEIGHT}
              ticks={rulerTicks}
              pxPerSecond={pxPerSecond}
            />
            {rulerTicks.map((t) => (
              <Text
                key={`label-${t}`}
                style={[styles.rulerTickLabel, { left: t * pxPerSecond - 14 }]}
              >
                {formatTimelineTime(t)}
              </Text>
            ))}
          </Animated.View>
        </View>
      </View>

      <View
        style={styles.tracksViewport}
        onLayout={(e) => setTracksViewportHeight(e.nativeEvent.layout.height)}
      >
        <GestureDetector gesture={gestures}>
          <ScrollView
            style={styles.tracksScroll}
            contentContainerStyle={[styles.tracksScrollContent, { minHeight: bodyHeight }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            nestedScrollEnabled
          >
            <View style={[styles.body, { height: bodyHeight }]}>
              <TimelineSidebar
                tracks={trackRows}
                contentHeight={bodyHeight}
                muted={selectedClip?.muted ?? false}
                canMute={!!selectedClip?.hasAudio}
                onToggleMute={() => {
                  if (selectedClip) toggleClipMuted(selectedClip.id);
                }}
                onImport={onImport}
                onAddText={onAddText}
              />

              <View style={styles.tracksArea}>
                <View style={styles.tracksClip}>
                  {!hasClips ? (
                    <EmptyTrackStack trackRows={trackRows} onImport={onImport} onAddText={onAddText} />
                  ) : (
                    <Animated.View
                      style={[
                        styles.content,
                        { width: contentWidth, height: bodyHeight },
                        contentShift,
                      ]}
                    >
                      {trackRows.map((track, index) => (
                        <React.Fragment key={track.id}>
                          {index > 0 ? <View style={styles.laneGap} /> : null}
                          <TrackLane
                            track={track}
                            clips={clips}
                            overlays={overlays}
                            segments={allSegments}
                            thumbnails={thumbnails}
                            displayUris={displayUris}
                            selectedClipId={selectedClipId}
                            timelineWidth={timelineWidth}
                            pxPerSecond={pxPerSecond}
                            onImport={onImport}
                            onAddText={onAddText}
                            onSelectClip={(clipId) => {
                              if (clipId === selectedClipId) selectClip(null);
                              else selectClip(clipId);
                            }}
                          />
                        </React.Fragment>
                      ))}
                    </Animated.View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </GestureDetector>

        <View
          pointerEvents="none"
          style={[
            styles.playhead,
            {
              left: STUDIO_SIDEBAR_WIDTH + tracksWidth / 2 - 1,
            },
          ]}
        />

        {hasClips ? (
          <Pressable
            style={styles.addFabFixed}
            onPress={onImport}
            accessibilityLabel="Add clip"
          >
            <AppSymbol name="add" size={20} tintColor={editorTheme.background} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TimelineRulerCanvas({
  width,
  height,
  ticks,
  pxPerSecond,
}: {
  width: number;
  height: number;
  ticks: number[];
  pxPerSecond: number;
}) {
  return (
    <Canvas style={{ width, height }}>
      {ticks.map((t) => {
        const x = t * pxPerSecond;
        return (
          <React.Fragment key={t}>
            <Line
              p1={{ x, y: height - 6 }}
              p2={{ x, y: height }}
              color={editorTheme.border}
              strokeWidth={1}
            />
            <Rect x={x - 14} y={2} width={28} height={12} color="transparent" />
          </React.Fragment>
        );
      })}
    </Canvas>
  );
}

function TrackLane({
  track,
  clips,
  overlays,
  segments,
  thumbnails,
  displayUris,
  selectedClipId,
  timelineWidth,
  pxPerSecond,
  onImport,
  onAddText,
  onSelectClip,
}: {
  track: TimelineTrackRow;
  clips: EditorClip[];
  overlays: TextOverlay[];
  segments: ReturnType<typeof buildTimelineClipSegments>;
  thumbnails: Record<string, VideoThumbnail[]>;
  displayUris: Record<string, string>;
  selectedClipId: string | null;
  timelineWidth: number;
  pxPerSecond: number;
  onImport: () => void;
  onAddText: () => void;
  onSelectClip: (clipId: string) => void;
}) {
  if (track.kind === 'video' && track.index === 0) {
    return (
      <View style={[styles.videoLane, { height: track.height }]}>
        {segments.map((segment) => (
          <ClipSegment
            key={segment.key}
            segment={segment}
            laneHeight={track.height}
            thumbnails={thumbnails[segment.clip.uri]}
            displayUri={displayUris[segment.clip.uri]}
            selected={segment.clip.id === selectedClipId}
            onSelect={() => onSelectClip(segment.clip.id)}
          />
        ))}
        <Pressable
          style={[
            styles.addEnding,
            {
              left: timelineWidth + TIMELINE_ADD_ENDING_GAP,
              width: TIMELINE_ADD_ENDING_WIDTH,
              height: track.height - 8,
            },
          ]}
          onPress={onImport}
          accessibilityLabel="Add ending"
        >
          <AppSymbol name="add" size={16} tintColor={editorTheme.textMuted} />
          <Text style={styles.addEndingText} numberOfLines={2}>
            Add ending
          </Text>
        </Pressable>
      </View>
    );
  }

  if (track.kind === 'audio' && track.index === 0) {
    return (
      <TimelineWaveformCanvas
        clips={clips}
        pxPerSecond={pxPerSecond}
        width={timelineWidth}
        height={track.height}
      />
    );
  }

  if (track.kind === 'audio') {
    return <EmptyLane label="+ Add audio" onPress={onImport} height={track.height} />;
  }

  const rowOverlays = overlaysForTextTrack(overlays, track.index);
  if (rowOverlays.length === 0) {
    return <EmptyLane label="+ Add text" onPress={onAddText} height={track.height} />;
  }

  return (
    <View style={[styles.textLane, { width: timelineWidth, height: track.height }]}>
      {rowOverlays.map((overlay) => (
        <View key={overlay.id} style={styles.textChip}>
          <Text style={styles.textChipLabel} numberOfLines={1}>
            {overlay.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyTrackStack({
  trackRows,
  onImport,
  onAddText,
}: {
  trackRows: TimelineTrackRow[];
  onImport: () => void;
  onAddText: () => void;
}) {
  return (
    <View style={styles.emptyStack}>
      {trackRows.map((track, index) => (
        <React.Fragment key={track.id}>
          {index > 0 ? <View style={styles.laneGap} /> : null}
          {track.kind === 'video' ? (
            <Pressable style={[styles.emptyVideoLane, { height: track.height }]} onPress={onImport}>
              <AppSymbol name="add" size={18} tintColor={editorTheme.textMuted} />
              <Text style={styles.emptyLaneText}>Add clip</Text>
            </Pressable>
          ) : track.kind === 'audio' ? (
            <EmptyLane label="+ Add audio" onPress={onImport} height={track.height} />
          ) : (
            <EmptyLane label="+ Add text" onPress={onAddText} height={track.height} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function ClipSegment({
  segment,
  laneHeight,
  thumbnails,
  displayUri,
  selected,
  onSelect,
}: {
  segment: ReturnType<typeof buildTimelineClipSegments>[number];
  laneHeight: number;
  thumbnails: VideoThumbnail[] | undefined;
  displayUri: string | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const isVideo = segment.clip.mediaType === 'video';
  const tileCount = filmstripTileCount(segment.width);
  const tiles = Array.from({ length: tileCount }, (_, index) => {
    const width =
      index === tileCount - 1
        ? segment.width - TIMELINE_CELL_WIDTH * (tileCount - 1)
        : TIMELINE_CELL_WIDTH;
    return { index, width };
  });

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.clipSegment,
        {
          left: segment.x,
          width: segment.width,
          height: laneHeight,
        },
        selected && styles.clipSelected,
      ]}
    >
      {isVideo ? (
        <View style={styles.clipBadge}>
          <AppSymbol name="play" size={8} tintColor={editorTheme.text} />
        </View>
      ) : null}
      <View style={styles.filmstrip}>
        {tiles.map(({ index, width }) => (
          <FilmstripTile
            key={`${segment.key}:${index}`}
            clip={segment.clip}
            thumbnails={thumbnails}
            displayUri={displayUri}
            tileIndex={index}
            tileCount={tileCount}
            width={width}
          />
        ))}
      </View>
    </Pressable>
  );
}

function FilmstripTile({
  clip,
  thumbnails,
  displayUri,
  tileIndex,
  tileCount,
  width,
}: {
  clip: ReturnType<typeof buildTimelineClipSegments>[number]['clip'];
  thumbnails: VideoThumbnail[] | undefined;
  displayUri: string | undefined;
  tileIndex: number;
  tileCount: number;
  width: number;
}) {
  const source = previewSourceForClip(
    clip,
    thumbnails,
    displayUri,
    (tileIndex + 0.5) / tileCount,
  );

  return (
    <View style={[styles.filmstripTile, { width }]}>
      {source ? (
        <Image
          source={source}
          style={styles.thumb}
          contentFit="cover"
          recyclingKey={`${clip.id}:${tileIndex}`}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
    </View>
  );
}

function previewSourceForClip(
  clip: ReturnType<typeof buildTimelineClipSegments>[number]['clip'],
  thumbnails: VideoThumbnail[] | undefined,
  displayUri: string | undefined,
  normalizedTime: number,
): { uri: string } | VideoThumbnail | null {
  const uri = displayUri ?? clip.uri;

  if (clip.mediaType === 'image') {
    return { uri };
  }

  const clipLen = Math.max(0.001, clip.trimEnd - clip.trimStart);
  const sourceTime = clip.trimStart + normalizedTime * clipLen;

  if (thumbnails && thumbnails.length > 0) {
    const idx = Math.min(
      thumbnails.length - 1,
      Math.round(
        (sourceTime / Math.max(0.001, clip.sourceDuration)) * (thumbnails.length - 1),
      ),
    );
    return thumbnails[idx];
  }

  return { uri };
}

function EmptyLane({
  label,
  onPress,
  height,
}: {
  label: string;
  onPress: () => void;
  height: number;
}) {
  return (
    <Pressable style={[styles.emptyLane, { height }]} onPress={onPress}>
      <Text style={styles.emptyLaneText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: editorTheme.background,
  },
  tracksViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tracksScroll: {
    flex: 1,
  },
  tracksScrollContent: {
    flexGrow: 1,
  },
  rulerRow: {
    height: STUDIO_RULER_HEIGHT,
    justifyContent: 'center',
    paddingLeft: STUDIO_SIDEBAR_WIDTH + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: editorTheme.border,
  },
  rulerClock: {
    color: editorTheme.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    zIndex: 2,
  },
  rulerClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  rulerShift: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  rulerTickLabel: {
    position: 'absolute',
    top: 2,
    width: 28,
    textAlign: 'center',
    color: editorTheme.textMuted,
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  body: {
    flexDirection: 'row',
  },
  tracksArea: {
    flex: 1,
    position: 'relative',
  },
  tracksClip: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    position: 'relative',
  },
  emptyStack: {
    flex: 1,
    paddingTop: 2,
  },
  videoLane: {
    backgroundColor: editorTheme.surface,
    position: 'relative',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  emptyVideoLane: {
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
  },
  laneGap: {
    height: STUDIO_LANE_GAP,
  },
  clipSegment: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    borderLeftWidth: 2,
    borderLeftColor: editorTheme.accent,
    borderRadius: 4,
  },
  clipBadge: {
    position: 'absolute',
    top: 3,
    left: 4,
    zIndex: 2,
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmstrip: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  filmstripTile: {
    height: '100%',
    overflow: 'hidden',
  },
  clipSelected: {
    borderWidth: 2,
    borderColor: editorTheme.text,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: editorTheme.surfaceRaised,
  },
  addEnding: {
    position: 'absolute',
    top: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  addEndingText: {
    color: editorTheme.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  addFabFixed: {
    position: 'absolute',
    right: 8,
    top: 3,
    width: 32,
    height: STUDIO_VIDEO_LANE_HEIGHT - 6,
    borderRadius: (STUDIO_VIDEO_LANE_HEIGHT - 6) / 2,
    backgroundColor: editorTheme.text,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  textLane: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    backgroundColor: editorTheme.surface,
  },
  textChip: {
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: editorTheme.surfaceRaised,
    borderWidth: 1,
    borderColor: editorTheme.border,
  },
  textChipLabel: {
    color: editorTheme.text,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyLane: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
  },
  emptyLaneText: {
    color: editorTheme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: editorTheme.text,
    borderRadius: 1,
    zIndex: 20,
  },
});
