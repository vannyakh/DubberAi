import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { VideoPlayer, VideoThumbnail, VideoView } from 'expo-video';
import { Image, type ImageSource } from 'expo-image';
import { Canvas, Fill, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { fontSizes, radius, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { resolveCanvasAspectRatio } from '../aspect-ratios';
import { blurBackgroundSourceForClip, nearestVideoThumbnail } from '../blur-background-source';
import { CanvasBlurBackground } from './canvas-blur-background';
import { PreviewSelectionHandles } from './preview-selection-handles';
import { PreviewSnapGuides } from './preview-snap-guides';
import { useEditorStore } from '../editor-store';
import { PreviewMediaOverlay } from './preview-media-overlay';
import { useClipDisplayUris } from '../hooks/use-clip-display-uri';
import { useMediaOverlayDisplayUris } from '../hooks/use-media-overlay-display-uri';
import { usePreviewCanvasGestures } from '../hooks/use-preview-canvas-gestures';
import { useStableBlurBackgroundSource } from '../hooks/use-stable-blur-background-source';
import { fitSizeToAspect } from '../preview-aspect';
import type { PreviewContentTransform } from '../preview-content-rect';
import { contentAnchorStyle, containedMediaRect, previewTransformStyle } from '../preview-content-rect';
import type { SnapLine } from '../preview-snap';
import { clipAtTime, FILTER_PRESETS, mediaOverlaysAtTime, TextOverlay } from '../types';

interface PreviewProps {
  player: VideoPlayer;
  thumbnails?: Record<string, VideoThumbnail[]>;
  posterFrames?: Record<string, VideoThumbnail>;
}

function clipTransform(clip: {
  contentScale: number;
  contentOffsetX: number;
  contentOffsetY: number;
  contentRotation?: number;
}): PreviewContentTransform {
  return {
    scale: Math.max(0.5, clip.contentScale ?? 1),
    offsetX: clip.contentOffsetX ?? 0,
    offsetY: clip.contentOffsetY ?? 0,
    rotation: clip.contentRotation ?? 0,
  };
}

/**
 * Centered card frame for the canvas. Native VideoView must NOT sit inside a
 * Reanimated transform layer — that breaks AVPlayerLayer on iOS.
 */
export function Preview({ player, thumbnails, posterFrames }: PreviewProps) {
  const clips = useEditorStore((s) => s.clips);
  const mediaOverlays = useEditorStore((s) => s.mediaOverlays);
  const displayUris = useClipDisplayUris(clips);
  const mediaDisplayUris = useMediaOverlayDisplayUris(mediaOverlays);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectedMediaOverlayId = useEditorStore((s) => s.selectedMediaOverlayId);
  const selectClip = useEditorStore((s) => s.selectClip);
  const selectMediaOverlay = useEditorStore((s) => s.selectMediaOverlay);
  const globalFilterId = useEditorStore((s) => s.filterId);
  const canvasAspectId = useEditorStore((s) => s.canvasAspectId);
  const canvasBackground = useEditorStore((s) => s.canvasBackground);
  const canvasBackgroundMode = useEditorStore((s) => s.canvasBackgroundMode);
  const canvasBlurType = useEditorStore((s) => s.canvasBlurType);
  const overlays = useEditorStore((s) => s.overlays);
  const setClipContentTransform = useEditorStore((s) => s.setClipContentTransform);
  const setMediaOverlayTransform = useEditorStore((s) => s.setMediaOverlayTransform);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [videoFrameReady, setVideoFrameReady] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [zoomLabel, setZoomLabel] = useState('100%');
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  const active = clipAtTime(clips, playhead);
  const selectedClip = selectedClipId ? clips.find((c) => c.id === selectedClipId) : null;
  const filterId = selectedClip?.filterId ?? active?.clip.filterId ?? globalFilterId;
  const preset = FILTER_PRESETS.find((p) => p.id === filterId) ?? FILTER_PRESETS[0];
  const showImage = active?.clip.mediaType === 'image';
  const transformClip = active?.clip ?? null;
  const isClipSelected =
    !!active && selectedClipId === active.clip.id && !selectedMediaOverlayId;

  const visibleMediaOverlays = useMemo(
    () => mediaOverlaysAtTime(mediaOverlays, playhead),
    [mediaOverlays, playhead],
  );

  const aspectRatio = useMemo(
    () => resolveCanvasAspectRatio(clips, canvasAspectId),
    [clips, canvasAspectId],
  );
  const frame = useMemo(
    () => fitSizeToAspect(available.width, available.height, aspectRatio),
    [available.width, available.height, aspectRatio],
  );

  const hasFrame = frame.width > 0 && frame.height > 0;
  const frameSizeStyle = hasFrame ? { width: frame.width, height: frame.height } : styles.cardFallback;
  const mediaStyle: ImageStyle = hasFrame
    ? { width: frame.width, height: frame.height }
    : styles.mediaFill;

  const contentRect = useMemo(() => {
    if (!transformClip || !hasFrame) return { x: 0, y: 0, width: 0, height: 0 };
    return containedMediaRect(frame.width, frame.height, transformClip.width, transformClip.height);
  }, [frame.height, frame.width, hasFrame, transformClip]);

  const contentAnchor = useMemo(
    () => (contentRect.width > 0 ? contentAnchorStyle(contentRect) : null),
    [contentRect],
  );

  const contentMediaStyle: ImageStyle = useMemo(
    () =>
      contentRect.width > 0
        ? { width: contentRect.width, height: contentRect.height }
        : mediaStyle,
    [contentRect.height, contentRect.width, mediaStyle],
  );

  const poster = useMemo(() => {
    if (!active || active.clip.mediaType !== 'video') return null;
    const sourceTime = active.clip.trimStart + active.localTime;
    return (
      nearestVideoThumbnail(thumbnails?.[active.clip.uri], sourceTime) ??
      posterFrames?.[active.clip.uri] ??
      null
    );
  }, [active, posterFrames, thumbnails]);

  const stillFrameSource = useMemo(() => {
    if (!active || active.clip.mediaType !== 'video') return null;
    if (poster) return poster;
    return null;
  }, [active, poster]);

  const blurBackgroundSource = useMemo((): ImageSource | null => {
    if (!active) return null;
    const sourceTime = active.clip.trimStart + active.localTime;
    return blurBackgroundSourceForClip(
      active.clip,
      sourceTime,
      thumbnails?.[active.clip.uri],
      posterFrames?.[active.clip.uri],
    );
  }, [active, posterFrames, thumbnails]);

  const blurClipKey = active ? `${active.index}:${active.clip.id}` : 'none';
  const stableBlurSource = useStableBlurBackgroundSource(
    blurBackgroundSource,
    blurClipKey,
    isPlaying,
  );
  const blurRecyclingKey = `${blurClipKey}:${canvasBlurType}`;

  const videoMountKey = active ? `${active.index}:${active.clip.id}` : 'empty';
  const showLiveVideo = videoFrameReady || isPlaying;

  useEffect(() => {
    setVideoFrameReady(false);
  }, [videoMountKey]);

  const storedTransform = transformClip ? clipTransform(transformClip) : null;

  const handleOverlayTransformCommit = useCallback(
    (overlayId: string, next: PreviewContentTransform) => {
      setMediaOverlayTransform(overlayId, {
        contentScale: next.scale,
        contentOffsetX: next.offsetX,
        contentOffsetY: next.offsetY,
        contentRotation: next.rotation,
      });
    },
    [setMediaOverlayTransform],
  );
  const handleTransformCommit = useCallback(
    (clipId: string, next: PreviewContentTransform) => {
      setClipContentTransform(clipId, {
        contentScale: next.scale,
        contentOffsetX: next.offsetX,
        contentOffsetY: next.offsetY,
        contentRotation: next.rotation,
      });
    },
    [setClipContentTransform],
  );

  const {
    canvasGesture,
    contentStyle,
    scale: liveScale,
    zoomBadgeOpacity,
    cornerGestures,
  } = usePreviewCanvasGestures({
    clipId: isClipSelected ? transformClip?.id ?? null : null,
    enabled: isClipSelected,
    frameWidth: frame.width,
    frameHeight: frame.height,
    contentBaseSize: Math.min(contentRect.width, contentRect.height),
    contentWidth: contentRect.width,
    contentHeight: contentRect.height,
    transform: storedTransform ?? { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    onCommit: handleTransformCommit,
    onGestureActiveChange: setGestureActive,
    onSnapLinesChange: setSnapLines,
    gestureActive,
  });

  const tapSelect = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(12)
    .onEnd(() => {
      if (!active?.clip.id) return;
      runOnJS(selectClip)(active.clip.id);
    });

  const previewGesture = Gesture.Exclusive(canvasGesture, tapSelect);

  useAnimatedReaction(
    () => (zoomBadgeOpacity.value > 0.01 ? liveScale.value : -1),
    (value, prev) => {
      if (value < 0) return;
      const pct = Math.round(value * 100);
      const prevPct = prev != null && prev >= 0 ? Math.round(prev * 100) : -1;
      if (pct !== prevPct) runOnJS(setZoomLabel)(`${pct}%`);
    },
  );

  const staticTransformStyle = useMemo(
    () =>
      storedTransform && hasFrame
        ? previewTransformStyle(frame.width, frame.height, storedTransform)
        : undefined,
    [storedTransform, frame.height, frame.width, hasFrame],
  );

  const zoomBadgeStyle = useAnimatedStyle(() => ({
    opacity: zoomBadgeOpacity.value,
  }));

  return (
    <View
      style={styles.workspace}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setAvailable({ width, height });
      }}
    >
      <GestureDetector gesture={previewGesture}>
        <View style={[styles.card, frameSizeStyle]}>
          <View
            style={[
              styles.canvas,
              canvasBackgroundMode === 'solid' ? { backgroundColor: canvasBackground } : null,
              frameSizeStyle,
            ]}
          >
            {canvasBackgroundMode === 'blur' ? (
              <CanvasBlurBackground
                source={stableBlurSource}
                blurType={canvasBlurType}
                recyclingKey={blurRecyclingKey}
              />
            ) : null}
            {showImage && active && contentAnchor ? (
              <View style={[styles.mediaSlot, frameSizeStyle]}>
                <Animated.View style={[contentAnchor, contentStyle]}>
                  <Image
                    source={{ uri: displayUris[active.clip.uri] ?? active.clip.uri }}
                    style={contentMediaStyle}
                    contentFit="cover"
                  />
                </Animated.View>
              </View>
            ) : active?.clip.mediaType === 'video' && contentAnchor ? (
              <View style={[styles.mediaSlot, frameSizeStyle]}>
                {!gestureActive ? (
                  <View style={[contentAnchor, staticTransformStyle]}>
                    {stillFrameSource && !showLiveVideo ? (
                      <Image
                        source={stillFrameSource}
                        style={contentMediaStyle}
                        contentFit="cover"
                        recyclingKey={`${videoMountKey}:still`}
                      />
                    ) : null}
                    <VideoView
                      key={videoMountKey}
                      player={player}
                      style={[contentMediaStyle, !showLiveVideo && styles.videoHidden]}
                      contentFit="cover"
                      nativeControls={false}
                      allowsVideoFrameAnalysis={false}
                      onFirstFrameRender={() => setVideoFrameReady(true)}
                    />
                  </View>
                ) : (
                  <Animated.View style={[contentAnchor, contentStyle]}>
                    <Image
                      source={
                        stillFrameSource ??
                        posterFrames?.[active.clip.uri] ?? {
                          uri: displayUris[active.clip.uri] ?? active.clip.uri,
                        }
                      }
                      style={contentMediaStyle}
                      contentFit="cover"
                      recyclingKey={`${videoMountKey}:gesture`}
                    />
                  </Animated.View>
                )}
              </View>
            ) : active?.clip.mediaType === 'video' || showImage ? null : clips.length === 0 ? (
              <View style={[styles.mediaSlot, frameSizeStyle]}>
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Add footage to preview</Text>
                </View>
              </View>
            ) : null}

            {hasFrame
              ? visibleMediaOverlays.map((mediaOverlay) => (
                  <PreviewMediaOverlay
                    key={mediaOverlay.id}
                    overlay={mediaOverlay}
                    frameWidth={frame.width}
                    frameHeight={frame.height}
                    displayUri={mediaDisplayUris[mediaOverlay.uri] ?? mediaOverlay.uri}
                    selected={selectedMediaOverlayId === mediaOverlay.id}
                    thumbnails={thumbnails?.[mediaOverlay.uri]}
                    posterFrame={posterFrames?.[mediaOverlay.uri]}
                    onSelect={() => selectMediaOverlay(mediaOverlay.id)}
                    onTransformCommit={handleOverlayTransformCommit}
                  />
                ))
              : null}

            {hasFrame && preset.id !== 'none' && (
              <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                {preset.tint !== 'transparent' && <Fill color={preset.tint} />}
                {preset.vignette > 0 && (
                  <Rect x={0} y={0} width={frame.width} height={frame.height}>
                    <RadialGradient
                      c={vec(frame.width / 2, frame.height / 2)}
                      r={Math.max(frame.width, frame.height) * 0.72}
                      colors={['rgba(0,0,0,0)', `rgba(0,0,0,${preset.vignette})`]}
                    />
                  </Rect>
                )}
              </Canvas>
            )}

            {isClipSelected && transformClip && hasFrame ? (
              <PreviewSelectionHandles
                frameWidth={frame.width}
                frameHeight={frame.height}
                clip={transformClip}
                contentStyle={contentStyle}
                cornerGestures={cornerGestures}
              />
            ) : null}

            <PreviewSnapGuides
              frameWidth={frame.width}
              frameHeight={frame.height}
              lines={snapLines}
            />

            {overlays.map((overlay) => (
              <DraggableOverlay key={overlay.id} overlay={overlay} bounds={frame} />
            ))}
          </View>

          <Animated.View style={[styles.zoomBadge, zoomBadgeStyle]} pointerEvents="none">
            <Text style={styles.zoomBadgeText}>{zoomLabel}</Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

function DraggableOverlay({
  overlay,
  bounds,
}: {
  overlay: TextOverlay;
  bounds: { width: number; height: number };
}) {
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const removeOverlay = useEditorStore((s) => s.removeOverlay);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const commit = (dx: number, dy: number) => {
    if (bounds.width === 0 || bounds.height === 0) return;
    updateOverlay(overlay.id, {
      x: Math.min(1, Math.max(0, overlay.x + dx / bounds.width)),
      y: Math.min(1, Math.max(0, overlay.y + dy / bounds.height)),
    });
    translateX.value = 0;
    translateY.value = 0;
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(commit)(e.translationX, e.translationY);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(removeOverlay)(overlay.id);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, pan)}>
      <Animated.View
        style={[
          styles.overlay,
          {
            left: `${overlay.x * 100}%`,
            top: `${overlay.y * 100}%`,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[styles.overlayText, { color: overlay.color, fontSize: overlay.fontSize }]}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  workspace: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorTheme.preview,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: editorTheme.border,
    backgroundColor: editorTheme.surfaceRaised,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  cardFallback: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  canvas: {
    overflow: 'hidden',
  },
  mediaSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFill: {
    ...StyleSheet.absoluteFill,
  },
  emptyCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyCanvasText: {
    color: editorTheme.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  videoHidden: {
    opacity: 0,
  },
  zoomBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  zoomBadgeText: {
    color: editorTheme.text,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
  },
  overlayText: {
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
