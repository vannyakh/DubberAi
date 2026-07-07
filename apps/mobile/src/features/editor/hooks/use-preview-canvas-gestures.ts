import { useCallback, useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { PreviewContentTransform } from '../preview-content-rect';
import {
  logicalToOffset,
  offsetToLogical,
  SNAP_THRESHOLD_PX,
  snapPosition,
  snapRotation,
  type SnapLine,
} from '../preview-snap';
import {
  triggerPreviewRotationSnapHaptic,
  triggerPreviewSnapHaptic,
} from '../services/preview-snap-haptics';

export const PREVIEW_MIN_SCALE = 0.5;
export const PREVIEW_MAX_SCALE = 4;

function clampScale(scale: number) {
  'worklet';
  return Math.max(PREVIEW_MIN_SCALE, Math.min(PREVIEW_MAX_SCALE, scale));
}

function clampOffset(value: number, scale: number) {
  'worklet';
  const limit = scale <= 1 ? 0.65 : (scale - 1) / scale + 0.12;
  return Math.max(-limit, Math.min(limit, value));
}

function normalizeDegrees(value: number) {
  'worklet';
  let deg = value % 360;
  if (deg > 180) deg -= 360;
  if (deg < -180) deg += 360;
  return deg;
}

function readTransform(
  scale: SharedValue<number>,
  offsetX: SharedValue<number>,
  offsetY: SharedValue<number>,
  rotation: SharedValue<number>,
): PreviewContentTransform {
  'worklet';
  return {
    scale: scale.value,
    offsetX: offsetX.value,
    offsetY: offsetY.value,
    rotation: rotation.value,
  };
}

function snapLinesSignature(lines: SnapLine[]): string {
  'worklet';
  if (lines.length === 0) return '';
  let sig = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    sig += `${line.type}:${Math.round(line.position * 10)};`;
  }
  return sig;
}

function isRotationInSnapZone(degrees: number): boolean {
  'worklet';
  const nearest = Math.round(degrees / 90) * 90;
  return Math.abs(degrees - nearest) <= 5;
}

interface Options {
  clipId: string | null;
  enabled: boolean;
  frameWidth: number;
  frameHeight: number;
  contentBaseSize: number;
  contentWidth: number;
  contentHeight: number;
  transform: PreviewContentTransform;
  onCommit: (clipId: string, transform: PreviewContentTransform) => void;
  onGestureActiveChange?: (active: boolean) => void;
  onSnapLinesChange?: (lines: SnapLine[]) => void;
  gestureActive?: boolean;
}

/** Pinch, pan, rotate, and handle-resize gestures for preview canvas footage. */
export function usePreviewCanvasGestures({
  clipId,
  enabled,
  frameWidth,
  frameHeight,
  contentBaseSize,
  contentWidth,
  contentHeight,
  transform,
  onCommit,
  onGestureActiveChange,
  onSnapLinesChange,
  gestureActive = false,
}: Options) {
  const scale = useSharedValue(transform.scale);
  const offsetX = useSharedValue(transform.offsetX);
  const offsetY = useSharedValue(transform.offsetY);
  const rotation = useSharedValue(transform.rotation);
  const isGesturing = useSharedValue(false);
  const zoomBadgeOpacity = useSharedValue(0);

  const pinchBase = useSharedValue(transform.scale);
  const panStartX = useSharedValue(transform.offsetX);
  const panStartY = useSharedValue(transform.offsetY);
  const rotationBase = useSharedValue(transform.rotation);
  const resizeBase = useSharedValue(transform.scale);
  const frameW = useSharedValue(frameWidth);
  const frameH = useSharedValue(frameHeight);
  const baseSize = useSharedValue(contentBaseSize);
  const contentW = useSharedValue(contentWidth);
  const contentH = useSharedValue(contentHeight);
  const lastSnapSignature = useSharedValue('');
  const rotationSnapEngaged = useSharedValue(false);

  useEffect(() => {
    frameW.value = frameWidth;
    frameH.value = frameHeight;
    baseSize.value = contentBaseSize;
    contentW.value = contentWidth;
    contentH.value = contentHeight;
  }, [
    frameWidth,
    frameHeight,
    contentBaseSize,
    contentWidth,
    contentHeight,
    frameW,
    frameH,
    baseSize,
    contentW,
    contentH,
  ]);

  useEffect(() => {
    if (gestureActive) return;
    scale.value = transform.scale;
    offsetX.value = transform.offsetX;
    offsetY.value = transform.offsetY;
    rotation.value = transform.rotation;
  }, [
    clipId,
    gestureActive,
    transform.scale,
    transform.offsetX,
    transform.offsetY,
    transform.rotation,
    scale,
    offsetX,
    offsetY,
    rotation,
  ]);

  const setGestureActive = useCallback(
    (active: boolean) => {
      onGestureActiveChange?.(active);
    },
    [onGestureActiveChange],
  );

  const commit = useCallback(
    (id: string, next: PreviewContentTransform) => {
      onCommit(id, next);
    },
    [onCommit],
  );

  const clearSnapLines = useCallback(() => {
    onSnapLinesChange?.([]);
  }, [onSnapLinesChange]);

  const publishSnapLines = useCallback(
    (lines: SnapLine[]) => {
      onSnapLinesChange?.(lines);
    },
    [onSnapLinesChange],
  );

  const fireSnapHaptic = useCallback(() => {
    triggerPreviewSnapHaptic();
  }, []);

  const fireRotationSnapHaptic = useCallback(() => {
    triggerPreviewRotationSnapHaptic();
  }, []);

  const applyRotationSnap = (proposed: number) => {
    'worklet';
    const inSnapZone = isRotationInSnapZone(proposed);
    if (inSnapZone && !rotationSnapEngaged.value) {
      rotationSnapEngaged.value = true;
      runOnJS(fireRotationSnapHaptic)();
    } else if (!inSnapZone) {
      rotationSnapEngaged.value = false;
    }
    rotation.value = snapRotation(proposed);
  };

  const applyPanSnap = (nextOffsetX: number, nextOffsetY: number) => {
    'worklet';
    const fw = frameW.value;
    const fh = frameH.value;
    const logical = offsetToLogical(nextOffsetX, nextOffsetY, fw, fh);
    const elementScale = scale.value;
    const { snappedPosition, activeLines } = snapPosition({
      proposedPosition: logical,
      canvasSize: { width: fw, height: fh },
      elementSize: {
        width: contentW.value * elementScale,
        height: contentH.value * elementScale,
      },
      rotation: rotation.value,
      snapThreshold: { x: SNAP_THRESHOLD_PX, y: SNAP_THRESHOLD_PX },
    });
    const snapped = logicalToOffset(snappedPosition.x, snappedPosition.y, fw, fh);
    offsetX.value = clampOffset(snapped.offsetX, elementScale);
    offsetY.value = clampOffset(snapped.offsetY, elementScale);

    const signature = snapLinesSignature(activeLines);
    if (signature !== lastSnapSignature.value) {
      if (signature.length > 0) {
        runOnJS(fireSnapHaptic)();
      }
      lastSnapSignature.value = signature;
    }

    if (onSnapLinesChange) runOnJS(publishSnapLines)(activeLines);
  };

  const beginGesture = () => {
    'worklet';
    if (isGesturing.value) return;
    isGesturing.value = true;
    if (onGestureActiveChange) runOnJS(setGestureActive)(true);
  };

  const beginScaleGesture = () => {
    'worklet';
    beginGesture();
    zoomBadgeOpacity.value = withTiming(1, { duration: 120 });
  };

  const endGesture = (id: string) => {
    'worklet';
    isGesturing.value = false;
    zoomBadgeOpacity.value = withTiming(0, { duration: 280 });
    lastSnapSignature.value = '';
    rotationSnapEngaged.value = false;
    if (onSnapLinesChange) runOnJS(clearSnapLines)();
    if (onGestureActiveChange) runOnJS(setGestureActive)(false);
    runOnJS(commit)(id, readTransform(scale, offsetX, offsetY, rotation));
  };

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onStart(() => {
      if (!clipId) return;
      beginScaleGesture();
      pinchBase.value = scale.value;
    })
    .onUpdate((e) => {
      if (!clipId) return;
      scale.value = clampScale(pinchBase.value * e.scale);
      offsetX.value = clampOffset(offsetX.value, scale.value);
      offsetY.value = clampOffset(offsetY.value, scale.value);
    })
    .onEnd(() => {
      if (!clipId) return;
      endGesture(clipId);
    })
    .onFinalize(() => {
      if (!clipId || isGesturing.value) return;
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minPointers(1)
    .maxPointers(1)
    .minDistance(6)
    .onStart(() => {
      if (!clipId) return;
      beginGesture();
      panStartX.value = offsetX.value;
      panStartY.value = offsetY.value;
      lastSnapSignature.value = '';
    })
    .onUpdate((e) => {
      if (!clipId) return;
      const normDx = e.translationX / Math.max(1, frameW.value);
      const normDy = e.translationY / Math.max(1, frameH.value);
      applyPanSnap(panStartX.value + normDx, panStartY.value + normDy);
    })
    .onEnd(() => {
      if (!clipId) return;
      endGesture(clipId);
    });

  const rotate = Gesture.Rotation()
    .enabled(enabled)
    .onStart(() => {
      if (!clipId) return;
      beginGesture();
      rotationBase.value = rotation.value;
      rotationSnapEngaged.value = false;
    })
    .onUpdate((e) => {
      if (!clipId) return;
      const proposed = normalizeDegrees(rotationBase.value + (e.rotation * 180) / Math.PI);
      applyRotationSnap(proposed);
    })
    .onEnd(() => {
      if (!clipId) return;
      endGesture(clipId);
    });

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (!clipId) return;
      beginGesture();
      scale.value = withTiming(1);
      offsetX.value = withTiming(0);
      offsetY.value = withTiming(0);
      rotation.value = withTiming(0);
      isGesturing.value = false;
      zoomBadgeOpacity.value = withTiming(0, { duration: 280 });
      if (onSnapLinesChange) runOnJS(clearSnapLines)();
      if (onGestureActiveChange) runOnJS(setGestureActive)(false);
      runOnJS(commit)(clipId, { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 });
    });

  const canvasGesture = Gesture.Simultaneous(
    pinch,
    rotate,
    Gesture.Race(doubleTap, pan),
  );

  const makeCornerResize = (signX: number, signY: number) =>
    Gesture.Pan()
      .enabled(enabled)
      .minDistance(2)
      .onStart(() => {
        if (!clipId) return;
        beginScaleGesture();
        resizeBase.value = scale.value;
      })
      .onUpdate((e) => {
        if (!clipId) return;
        const dominant =
          signX * signY > 0
            ? (signX * e.translationX + signY * e.translationY) / 2
            : signX * e.translationX || signY * e.translationY;
        const delta = dominant / Math.max(80, baseSize.value * 0.5);
        scale.value = clampScale(resizeBase.value + delta);
        offsetX.value = clampOffset(offsetX.value, scale.value);
        offsetY.value = clampOffset(offsetY.value, scale.value);
      })
      .onEnd(() => {
        if (!clipId) return;
        endGesture(clipId);
      });

  const makeRotateHandle = () =>
    Gesture.Pan()
      .enabled(enabled)
      .minDistance(2)
      .onStart(() => {
        if (!clipId) return;
        beginGesture();
        rotationBase.value = rotation.value;
        rotationSnapEngaged.value = false;
      })
      .onUpdate((e) => {
        if (!clipId) return;
        const pivot = Math.max(80, baseSize.value * 0.5);
        const proposed = normalizeDegrees(rotationBase.value + (e.translationX / pivot) * 45);
        applyRotationSnap(proposed);
      })
      .onEnd(() => {
        if (!clipId) return;
        endGesture(clipId);
      });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value * frameW.value * 0.5 },
      { translateY: offsetY.value * frameH.value * 0.5 },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return {
    canvasGesture,
    contentStyle,
    scale,
    rotation,
    isGesturing,
    zoomBadgeOpacity,
    cornerGestures: {
      topLeft: makeCornerResize(-1, -1),
      topRight: makeCornerResize(1, -1),
      bottomLeft: makeCornerResize(-1, 1),
      bottomRight: makeCornerResize(1, 1),
      rotate: makeRotateHandle(),
    },
  };
}
