import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { VideoThumbnail } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { nearestVideoThumbnail } from '../blur-background-source';
import { usePreviewCanvasGestures } from '../hooks/use-preview-canvas-gestures';
import type { PreviewContentTransform } from '../preview-content-rect';
import {
  contentAnchorStyle,
  containedMediaRect,
  previewTransformStyle,
} from '../preview-content-rect';
import type { SnapLine } from '../preview-snap';
import { MediaOverlay } from '../types';
import { PreviewSelectionHandles } from './preview-selection-handles';
import { PreviewSnapGuides } from './preview-snap-guides';

interface PreviewMediaOverlayProps {
  overlay: MediaOverlay;
  frameWidth: number;
  frameHeight: number;
  displayUri: string;
  selected: boolean;
  thumbnails?: VideoThumbnail[];
  posterFrame?: VideoThumbnail;
  onSelect: () => void;
  onTransformCommit: (id: string, transform: PreviewContentTransform) => void;
}

function overlayTransform(overlay: MediaOverlay): PreviewContentTransform {
  return {
    scale: Math.max(0.5, overlay.contentScale ?? 1),
    offsetX: overlay.contentOffsetX ?? 0,
    offsetY: overlay.contentOffsetY ?? 0,
    rotation: overlay.contentRotation ?? 0,
  };
}

export function PreviewMediaOverlay({
  overlay,
  frameWidth,
  frameHeight,
  displayUri,
  selected,
  thumbnails,
  posterFrame,
  onSelect,
  onTransformCommit,
}: PreviewMediaOverlayProps) {
  const [gestureActive, setGestureActive] = useState(false);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  const contentRect = useMemo(
    () => containedMediaRect(frameWidth, frameHeight, overlay.width, overlay.height),
    [frameHeight, frameWidth, overlay.height, overlay.width],
  );

  const contentAnchor = useMemo(
    () => (contentRect.width > 0 ? contentAnchorStyle(contentRect) : null),
    [contentRect],
  );

  const contentMediaStyle: ImageStyle = useMemo(
    () =>
      contentRect.width > 0
        ? { width: contentRect.width, height: contentRect.height }
        : StyleSheet.absoluteFill,
    [contentRect.height, contentRect.width],
  );

  const stillSource = useMemo(() => {
    if (overlay.mediaType === 'image') {
      return displayUri ? { uri: displayUri } : null;
    }
    const frame =
      nearestVideoThumbnail(thumbnails, overlay.trimStart) ?? posterFrame ?? null;
    return frame;
  }, [displayUri, overlay.mediaType, overlay.trimStart, posterFrame, thumbnails]);

  const storedTransform = overlayTransform(overlay);

  const handleCommit = useCallback(
    (id: string, next: PreviewContentTransform) => {
      onTransformCommit(id, next);
    },
    [onTransformCommit],
  );

  const {
    canvasGesture,
    contentStyle,
    cornerGestures,
  } = usePreviewCanvasGestures({
    clipId: selected ? overlay.id : null,
    enabled: selected,
    frameWidth,
    frameHeight,
    contentBaseSize: Math.min(contentRect.width, contentRect.height),
    contentWidth: contentRect.width,
    contentHeight: contentRect.height,
    transform: storedTransform,
    onCommit: handleCommit,
    onGestureActiveChange: setGestureActive,
    onSnapLinesChange: setSnapLines,
    gestureActive,
  });

  const tapSelect = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(12)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  const layerGesture = Gesture.Exclusive(canvasGesture, tapSelect);

  const staticTransformStyle = useMemo(
    () =>
      contentRect.width > 0
        ? previewTransformStyle(frameWidth, frameHeight, storedTransform)
        : undefined,
    [contentRect.width, frameHeight, frameWidth, storedTransform],
  );

  if (!contentAnchor || !stillSource) return null;

  return (
    <GestureDetector gesture={layerGesture}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {!gestureActive ? (
          <View style={[contentAnchor, staticTransformStyle]}>
            <Image
              source={stillSource}
              style={contentMediaStyle}
              contentFit="cover"
              recyclingKey={`${overlay.id}:still`}
            />
          </View>
        ) : (
          <Animated.View style={[contentAnchor, contentStyle]}>
            <Image
              source={stillSource}
              style={contentMediaStyle}
              contentFit="cover"
              recyclingKey={`${overlay.id}:gesture`}
            />
          </Animated.View>
        )}

        {selected ? (
          <>
            <PreviewSelectionHandles
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              clip={overlay}
              contentStyle={contentStyle}
              cornerGestures={cornerGestures}
            />
            <PreviewSnapGuides frameWidth={frameWidth} frameHeight={frameHeight} lines={snapLines} />
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}
