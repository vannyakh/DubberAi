import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Canvas, Line, Rect } from '@shopify/react-native-skia';
import { VideoThumbnail } from 'expo-video';
import Animated, { runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  mediaOverlaysForTrack,
  overlaysForTextTrack,
  timelineTracksContentHeight,
  TimelineTrackRow,
} from '../timeline-tracks';
import {
  buildTimelineClipSegments,
  formatTimelineTime,
  rulerTickStep,
  TIMELINE_ADD_ENDING_GAP,
  TIMELINE_ADD_ENDING_WIDTH,
} from '../timeline-utils';
import {
  useTimelineTrimHandle,
  useTimelineTrimPreview,
} from '../hooks/use-timeline-trim-handle';
import { useTimelineOverlayMove } from '../hooks/use-timeline-overlay-move';
import { TimelineTrimHandle } from './timeline-trim-handle';
import { TimelineTrimSnapGuide } from './timeline-trim-snap-guide';
import { TimelineFilmstrip } from './timeline-filmstrip';
import { useClipDisplayUris } from '../hooks/use-clip-display-uri';
import { useMediaOverlayDisplayUris } from '../hooks/use-media-overlay-display-uri';
import { useEditorStore } from '../editor-store';
import { TimelinePanGestureContext } from '../timeline-pan-gesture-context';
import { buildTimelineMoveSnapTargets, buildTimelineTrimSnapTargets } from '../timeline-trim-snap';
import { EditorClip, MediaOverlay, TextOverlay, mediaOverlayDuration, timelineDuration } from '../types';
import { TimelineSidebar } from './timeline-sidebar';
import { TimelineWaveformCanvas } from './timeline-waveform-canvas';

interface TimelineProps {
  thumbnails: Record<string, VideoThumbnail[]>;
  onImport: () => void;
  onAddText: () => void;
  onAddOverlay: () => void;
}

export function Timeline({ thumbnails, onImport, onAddText, onAddOverlay }: TimelineProps) {
  const { width: screenWidth } = useWindowDimensions();
  const tracksWidth = screenWidth - STUDIO_SIDEBAR_WIDTH;

  const clips = useEditorStore((s) => s.clips);
  const overlays = useEditorStore((s) => s.overlays);
  const mediaOverlays = useEditorStore((s) => s.mediaOverlays);
  const pxPerSecond = useEditorStore((s) => s.pxPerSecond);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectedMediaOverlayId = useEditorStore((s) => s.selectedMediaOverlayId);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setPxPerSecond = useEditorStore((s) => s.setPxPerSecond);
  const selectClip = useEditorStore((s) => s.selectClip);
  const selectMediaOverlay = useEditorStore((s) => s.selectMediaOverlay);
  const toggleClipMuted = useEditorStore((s) => s.toggleClipMuted);

  const totalDuration = timelineDuration(clips);
  const timelineWidth = Math.max(tracksWidth, totalDuration * pxPerSecond);
  const contentWidth = timelineWidth + TIMELINE_ADD_ENDING_GAP + TIMELINE_ADD_ENDING_WIDTH;

  const { sidePad, panGesture, gestures, contentShift } = useTimelineGestures({
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
  const mediaDisplayUris = useMediaOverlayDisplayUris(mediaOverlays);

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
                onAddOverlay={onAddOverlay}
              />

              <View style={styles.tracksArea}>
                <View style={styles.tracksClip}>
                  {!hasClips ? (
                    <EmptyTrackStack
                      trackRows={trackRows}
                      onImport={onImport}
                      onAddText={onAddText}
                      onAddOverlay={onAddOverlay}
                    />
                  ) : (
                    <TimelinePanGestureContext.Provider value={panGesture}>
                      <Animated.View
                        style={[
                          styles.content,
                          { width: contentWidth, height: bodyHeight },
                          contentShift,
                        ]}
                      >
                        <TimelineTrimSnapGuide height={bodyHeight} />
                        {trackRows.map((track, index) => (
                          <React.Fragment key={track.id}>
                            {index > 0 ? <View style={styles.laneGap} /> : null}
                            <TrackLane
                              track={track}
                              clips={clips}
                              overlays={overlays}
                              mediaOverlays={mediaOverlays}
                              segments={allSegments}
                              thumbnails={thumbnails}
                              displayUris={displayUris}
                              mediaDisplayUris={mediaDisplayUris}
                              selectedClipId={selectedClipId}
                              selectedMediaOverlayId={selectedMediaOverlayId}
                              timelineWidth={timelineWidth}
                              pxPerSecond={pxPerSecond}
                              onImport={onImport}
                              onAddText={onAddText}
                              onAddOverlay={onAddOverlay}
                              onSelectClip={(clipId) => {
                                if (clipId === selectedClipId) selectClip(null);
                                else selectClip(clipId);
                              }}
                              onSelectMediaOverlay={(overlayId) => {
                                if (overlayId === selectedMediaOverlayId) selectMediaOverlay(null);
                                else selectMediaOverlay(overlayId);
                              }}
                            />
                          </React.Fragment>
                        ))}
                      </Animated.View>
                    </TimelinePanGestureContext.Provider>
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
  mediaOverlays,
  segments,
  thumbnails,
  displayUris,
  mediaDisplayUris,
  selectedClipId,
  selectedMediaOverlayId,
  timelineWidth,
  pxPerSecond,
  onImport,
  onAddText,
  onAddOverlay,
  onSelectClip,
  onSelectMediaOverlay,
}: {
  track: TimelineTrackRow;
  clips: EditorClip[];
  overlays: TextOverlay[];
  mediaOverlays: MediaOverlay[];
  segments: ReturnType<typeof buildTimelineClipSegments>;
  thumbnails: Record<string, VideoThumbnail[]>;
  displayUris: Record<string, string>;
  mediaDisplayUris: Record<string, string>;
  selectedClipId: string | null;
  selectedMediaOverlayId: string | null;
  timelineWidth: number;
  pxPerSecond: number;
  onImport: () => void;
  onAddText: () => void;
  onAddOverlay: () => void;
  onSelectClip: (clipId: string) => void;
  onSelectMediaOverlay: (overlayId: string) => void;
}) {
  if (track.kind === 'video' && track.index === 0) {
    return (
      <View style={[styles.videoLane, { height: track.height }]}>
        {segments.map((segment) => (
          <ClipSegment
            key={segment.key}
            segment={segment}
            pxPerSecond={pxPerSecond}
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

  if (track.kind === 'media' && track.index === 0) {
    const rowOverlays = mediaOverlaysForTrack(mediaOverlays, track.index);
    if (rowOverlays.length === 0) {
      return <EmptyLane label="+ Add overlay" onPress={onAddOverlay} height={track.height} />;
    }

    return (
      <View style={[styles.mediaLane, { width: timelineWidth, height: track.height }]}>
        {rowOverlays.map((overlay) => (
          <MediaOverlaySegment
            key={overlay.id}
            overlay={overlay}
            laneHeight={track.height}
            pxPerSecond={pxPerSecond}
            displayUri={mediaDisplayUris[overlay.uri]}
            thumbnails={thumbnails[overlay.uri]}
            selected={overlay.id === selectedMediaOverlayId}
            onSelect={() => onSelectMediaOverlay(overlay.id)}
          />
        ))}
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

function MediaOverlaySegment({
  overlay,
  laneHeight,
  pxPerSecond,
  displayUri,
  thumbnails,
  selected,
  onSelect,
}: {
  overlay: MediaOverlay;
  laneHeight: number;
  pxPerSecond: number;
  displayUri: string | undefined;
  thumbnails: VideoThumbnail[] | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const trimMediaOverlay = useEditorStore((s) => s.trimMediaOverlay);
  const setMediaOverlayStartTime = useEditorStore((s) => s.setMediaOverlayStartTime);
  const playhead = useEditorStore((s) => s.playhead);
  const clips = useEditorStore((s) => s.clips);
  const allMediaOverlays = useEditorStore((s) => s.mediaOverlays);
  const width = Math.max(24, mediaOverlayDuration(overlay) * pxPerSecond);
  const left = overlay.startTime * pxPerSecond;
  const segmentHeight = laneHeight - 4;
  const tickStep = rulerTickStep(pxPerSecond);
  const trimBounds = useMemo(
    () => ({
      trimStart: overlay.trimStart,
      trimEnd: overlay.trimEnd,
      sourceDuration: overlay.sourceDuration,
      allowExtendOut: overlay.mediaType === 'image',
    }),
    [overlay.mediaType, overlay.sourceDuration, overlay.trimEnd, overlay.trimStart],
  );
  const edgeTimeIn = overlay.startTime;
  const edgeTimeOut = overlay.startTime + mediaOverlayDuration(overlay);
  const snapTargetsIn = useMemo(
    () =>
      buildTimelineTrimSnapTargets({
        playhead,
        clips,
        mediaOverlays: allMediaOverlays,
        tickStep,
        exclude: { kind: 'overlay', id: overlay.id, edge: 'in' },
      }),
    [allMediaOverlays, clips, overlay.id, playhead, tickStep],
  );
  const snapTargetsOut = useMemo(
    () =>
      buildTimelineTrimSnapTargets({
        playhead,
        clips,
        mediaOverlays: allMediaOverlays,
        tickStep,
        exclude: { kind: 'overlay', id: overlay.id, edge: 'out' },
      }),
    [allMediaOverlays, clips, overlay.id, playhead, tickStep],
  );
  const snapTargetsMove = useMemo(
    () =>
      buildTimelineMoveSnapTargets({
        playhead,
        clips,
        mediaOverlays: allMediaOverlays,
        tickStep,
        excludeOverlayId: overlay.id,
      }),
    [allMediaOverlays, clips, overlay.id, playhead, tickStep],
  );

  const onMove = useCallback(
    (deltaSeconds: number) => {
      const current =
        useEditorStore.getState().mediaOverlays.find((o) => o.id === overlay.id) ?? overlay;
      setMediaOverlayStartTime(current.id, Math.max(0, current.startTime + deltaSeconds));
    },
    [overlay, setMediaOverlayStartTime],
  );

  const onTrimIn = useCallback(
    (deltaSeconds: number) => {
      const current =
        useEditorStore.getState().mediaOverlays.find((o) => o.id === overlay.id) ?? overlay;
      const nextTrimStart = Math.max(
        0,
        Math.min(current.trimEnd - 0.1, current.trimStart + deltaSeconds),
      );
      const applied = nextTrimStart - current.trimStart;
      trimMediaOverlay(current.id, {
        trimStart: nextTrimStart,
        startTime: current.startTime + applied,
      });
    },
    [overlay, trimMediaOverlay],
  );

  const onTrimOut = useCallback(
    (deltaSeconds: number) => {
      const current =
        useEditorStore.getState().mediaOverlays.find((o) => o.id === overlay.id) ?? overlay;
      const nextTrimEnd =
        current.mediaType === 'image'
          ? Math.max(current.trimStart + 0.1, current.trimEnd + deltaSeconds)
          : Math.max(
              current.trimStart + 0.1,
              Math.min(current.sourceDuration, current.trimEnd + deltaSeconds),
            );
      trimMediaOverlay(current.id, { trimEnd: nextTrimEnd });
    },
    [overlay, trimMediaOverlay],
  );

  const trimIn = useTimelineTrimHandle({
    edge: 'in',
    pxPerSecond,
    bounds: trimBounds,
    edgeTimeSeconds: edgeTimeIn,
    snapTargets: snapTargetsIn,
    onSelect,
    onTrim: onTrimIn,
  });

  const trimOut = useTimelineTrimHandle({
    edge: 'out',
    pxPerSecond,
    bounds: trimBounds,
    edgeTimeSeconds: edgeTimeOut,
    snapTargets: snapTargetsOut,
    onSelect,
    onTrim: onTrimOut,
  });

  const move = useTimelineOverlayMove({
    pxPerSecond,
    startTimeSeconds: overlay.startTime,
    snapTargets: snapTargetsMove,
    onSelect,
    onMove,
  });

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onSelect)();
      }),
    [onSelect],
  );

  const bodyGesture = useMemo(
    () => Gesture.Exclusive(move.gesture, tapGesture),
    [move.gesture, tapGesture],
  );

  const previewStyle = useTimelineTrimPreview(
    left,
    width,
    trimIn.leftOffset,
    trimIn.widthDelta,
    trimOut.widthDelta,
    move.translateX,
  );

  const source = useMemo(
    () => ({
      id: overlay.id,
      uri: overlay.uri,
      mediaType: overlay.mediaType,
      trimStart: overlay.trimStart,
      trimEnd: overlay.trimEnd,
      sourceDuration: overlay.sourceDuration,
    }),
    [
      overlay.id,
      overlay.mediaType,
      overlay.sourceDuration,
      overlay.trimEnd,
      overlay.trimStart,
      overlay.uri,
    ],
  );

  return (
    <Animated.View
      style={[
        styles.mediaOverlaySegment,
        { height: segmentHeight },
        selected && styles.clipSelected,
        previewStyle,
      ]}
    >
      <GestureDetector gesture={bodyGesture}>
        <View style={StyleSheet.absoluteFill}>
          <TimelineFilmstrip
            source={source}
            segmentWidth={width}
            pxPerSecond={pxPerSecond}
            thumbnails={thumbnails}
            displayUri={displayUri}
          />
        </View>
      </GestureDetector>
      <View style={styles.mediaOverlayBadge} pointerEvents="none">
        <AppSymbol
          name={overlay.mediaType === 'video' ? 'film' : 'overlay'}
          size={10}
          tintColor={editorTheme.text}
        />
      </View>
      <TimelineTrimHandle
        edge="in"
        gesture={trimIn.gesture}
        height={segmentHeight}
        isDragging={trimIn.isDragging}
      />
      <TimelineTrimHandle
        edge="out"
        gesture={trimOut.gesture}
        height={segmentHeight}
        isDragging={trimOut.isDragging}
      />
    </Animated.View>
  );
}

function EmptyTrackStack({
  trackRows,
  onImport,
  onAddText,
  onAddOverlay,
}: {
  trackRows: TimelineTrackRow[];
  onImport: () => void;
  onAddText: () => void;
  onAddOverlay: () => void;
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
          ) : track.kind === 'media' ? (
            <EmptyLane label="+ Add overlay" onPress={onAddOverlay} height={track.height} />
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
  pxPerSecond,
  laneHeight,
  thumbnails,
  displayUri,
  selected,
  onSelect,
}: {
  segment: ReturnType<typeof buildTimelineClipSegments>[number];
  pxPerSecond: number;
  laneHeight: number;
  thumbnails: VideoThumbnail[] | undefined;
  displayUri: string | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const trimClip = useEditorStore((s) => s.trimClip);
  const playhead = useEditorStore((s) => s.playhead);
  const clips = useEditorStore((s) => s.clips);
  const mediaOverlays = useEditorStore((s) => s.mediaOverlays);
  const isVideo = segment.clip.mediaType === 'video';
  const tickStep = rulerTickStep(pxPerSecond);
  const filmstripSource = useMemo(
    () => ({
      id: segment.clip.id,
      uri: segment.clip.uri,
      mediaType: segment.clip.mediaType,
      trimStart: segment.clip.trimStart,
      trimEnd: segment.clip.trimEnd,
      sourceDuration: segment.clip.sourceDuration,
    }),
    [segment.clip],
  );
  const trimBounds = useMemo(
    () => ({
      trimStart: segment.clip.trimStart,
      trimEnd: segment.clip.trimEnd,
      sourceDuration: segment.clip.sourceDuration,
      allowExtendOut: segment.clip.mediaType === 'image',
    }),
    [
      segment.clip.mediaType,
      segment.clip.sourceDuration,
      segment.clip.trimEnd,
      segment.clip.trimStart,
    ],
  );
  const edgeTimeIn = segment.x / pxPerSecond;
  const edgeTimeOut = (segment.x + segment.width) / pxPerSecond;
  const snapTargetsIn = useMemo(
    () =>
      buildTimelineTrimSnapTargets({
        playhead,
        clips,
        mediaOverlays,
        tickStep,
        exclude: { kind: 'clip', id: segment.clip.id, edge: 'in' },
      }),
    [clips, mediaOverlays, playhead, segment.clip.id, tickStep],
  );
  const snapTargetsOut = useMemo(
    () =>
      buildTimelineTrimSnapTargets({
        playhead,
        clips,
        mediaOverlays,
        tickStep,
        exclude: { kind: 'clip', id: segment.clip.id, edge: 'out' },
      }),
    [clips, mediaOverlays, playhead, segment.clip.id, tickStep],
  );

  const onTrimIn = useCallback(
    (deltaSeconds: number) => {
      const clip =
        useEditorStore.getState().clips.find((c) => c.id === segment.clip.id) ?? segment.clip;
      const nextTrimStart = Math.max(
        0,
        Math.min(clip.trimEnd - 0.1, clip.trimStart + deltaSeconds),
      );
      trimClip(clip.id, nextTrimStart, clip.trimEnd);
    },
    [segment.clip, trimClip],
  );

  const onTrimOut = useCallback(
    (deltaSeconds: number) => {
      const clip =
        useEditorStore.getState().clips.find((c) => c.id === segment.clip.id) ?? segment.clip;
      const nextTrimEnd =
        clip.mediaType === 'image'
          ? Math.max(clip.trimStart + 0.1, clip.trimEnd + deltaSeconds)
          : Math.max(
              clip.trimStart + 0.1,
              Math.min(clip.sourceDuration, clip.trimEnd + deltaSeconds),
            );
      trimClip(clip.id, clip.trimStart, nextTrimEnd);
    },
    [segment.clip, trimClip],
  );

  const trimIn = useTimelineTrimHandle({
    edge: 'in',
    pxPerSecond,
    bounds: trimBounds,
    edgeTimeSeconds: edgeTimeIn,
    snapTargets: snapTargetsIn,
    onSelect,
    onTrim: onTrimIn,
  });

  const trimOut = useTimelineTrimHandle({
    edge: 'out',
    pxPerSecond,
    bounds: trimBounds,
    edgeTimeSeconds: edgeTimeOut,
    snapTargets: snapTargetsOut,
    onSelect,
    onTrim: onTrimOut,
  });

  const previewStyle = useTimelineTrimPreview(
    segment.x,
    segment.width,
    trimIn.leftOffset,
    trimIn.widthDelta,
    trimOut.widthDelta,
  );

  return (
    <Animated.View
      style={[
        styles.clipSegment,
        { height: laneHeight },
        selected && styles.clipSelected,
        previewStyle,
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onSelect}>
        {isVideo ? (
          <View style={styles.clipBadge} pointerEvents="none">
            <AppSymbol name="play" size={8} tintColor={editorTheme.text} />
          </View>
        ) : null}
        <View style={styles.filmstrip}>
          <TimelineFilmstrip
            source={filmstripSource}
            segmentWidth={segment.width}
            pxPerSecond={pxPerSecond}
            thumbnails={thumbnails}
            displayUri={displayUri}
          />
        </View>
      </Pressable>
      {selected ? (
        <>
          <TimelineTrimHandle
            edge="in"
            gesture={trimIn.gesture}
            height={laneHeight}
            isDragging={trimIn.isDragging}
          />
          <TimelineTrimHandle
            edge="out"
            gesture={trimOut.gesture}
            height={laneHeight}
            isDragging={trimOut.isDragging}
          />
        </>
      ) : null}
    </Animated.View>
  );
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
    borderRadius: 4,
    zIndex: 2,
  },
  clipSelected: {
    borderWidth: 2,
    borderColor: editorTheme.text,
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
  mediaLane: {
    position: 'relative',
    backgroundColor: editorTheme.surface,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  mediaOverlaySegment: {
    position: 'absolute',
    top: 2,
    overflow: 'hidden',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
    zIndex: 3,
  },
  mediaOverlayBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
