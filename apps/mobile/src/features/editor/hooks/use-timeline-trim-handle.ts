import { useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  triggerTimelineTrimGrabHaptic,
  triggerTimelineTrimSnapHaptic,
} from '../services/timeline-trim-haptics';
import {
  resolveTrimTranslation,
  timelineTrimSnapLineX,
  type TrimBounds,
  type TrimHandleEdge,
} from '../timeline-trim-snap';

import { useTimelinePanGesture } from '../timeline-pan-gesture-context';

export type { TrimBounds, TrimHandleEdge } from '../timeline-trim-snap';

const DRAG_COMMIT_PX = 2;
const MIN_SEGMENT_PX = 6;

interface UseTimelineTrimHandleOptions {
  edge: TrimHandleEdge;
  pxPerSecond: number;
  bounds: TrimBounds;
  edgeTimeSeconds: number;
  snapTargets: number[];
  onSelect: () => void;
  onTrim: (deltaSeconds: number) => void;
}

function applyTrimPreview(
  edge: TrimHandleEdge,
  translationX: number,
  leftOffset: SharedValue<number>,
  widthDelta: SharedValue<number>,
) {
  'worklet';
  if (edge === 'in') {
    leftOffset.value = translationX;
    widthDelta.value = -translationX;
    return;
  }
  widthDelta.value = translationX;
}

function clearTrimSnapGuide() {
  'worklet';
  timelineTrimSnapLineX.value = -1;
}

/** Drag a clip/overlay edge to trim duration (CapCut-style yellow handles). */
export function useTimelineTrimHandle({
  edge,
  pxPerSecond,
  bounds,
  edgeTimeSeconds,
  snapTargets,
  onSelect,
  onTrim,
}: UseTimelineTrimHandleOptions) {
  const leftOffset = useSharedValue(0);
  const widthDelta = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const pxPerSecSv = useSharedValue(pxPerSecond);
  const boundsSv = useSharedValue(bounds);
  const edgeTimeSv = useSharedValue(edgeTimeSeconds);
  const snapTargetsSv = useSharedValue<number[]>(snapTargets);
  const lastSnapTimeSv = useSharedValue(-1);

  const onSelectRef = useRef(onSelect);
  const onTrimRef = useRef(onTrim);
  const timelinePan = useTimelinePanGesture();

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onTrimRef.current = onTrim;
  }, [onTrim]);

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
  }, [pxPerSecond, pxPerSecSv]);

  useEffect(() => {
    boundsSv.value = {
      trimStart: bounds.trimStart,
      trimEnd: bounds.trimEnd,
      sourceDuration: bounds.sourceDuration,
      allowExtendOut: bounds.allowExtendOut ?? false,
    };
  }, [
    bounds.allowExtendOut,
    bounds.sourceDuration,
    bounds.trimEnd,
    bounds.trimStart,
    boundsSv,
  ]);

  useEffect(() => {
    edgeTimeSv.value = edgeTimeSeconds;
  }, [edgeTimeSeconds, edgeTimeSv]);

  useEffect(() => {
    snapTargetsSv.value = snapTargets;
  }, [snapTargets, snapTargetsSv]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(0)
      .hitSlop({ left: 10, right: 10, top: 8, bottom: 8 })
      .failOffsetY([-14, 14])
      .onBegin(() => {
        isDragging.value = 1;
        edgeTimeSv.value = edgeTimeSeconds;
        lastSnapTimeSv.value = -1;
        runOnJS(onSelectRef.current)();
        runOnJS(triggerTimelineTrimGrabHaptic)();
      })
      .onUpdate((e) => {
        const resolved = resolveTrimTranslation(
          edge,
          e.translationX,
          pxPerSecSv.value,
          boundsSv.value,
          edgeTimeSv.value,
          snapTargetsSv.value,
        );
        applyTrimPreview(edge, resolved.translationX, leftOffset, widthDelta);
        timelineTrimSnapLineX.value = resolved.snapLineX;

        if (resolved.snapTime >= 0) {
          if (lastSnapTimeSv.value !== resolved.snapTime) {
            lastSnapTimeSv.value = resolved.snapTime;
            runOnJS(triggerTimelineTrimSnapHaptic)();
          }
          return;
        }

        lastSnapTimeSv.value = -1;
      })
      .onEnd((e) => {
        const resolved = resolveTrimTranslation(
          edge,
          e.translationX,
          pxPerSecSv.value,
          boundsSv.value,
          edgeTimeSv.value,
          snapTargetsSv.value,
        );
        const clamped = resolved.translationX;

        if (Math.abs(clamped) >= DRAG_COMMIT_PX) {
          const deltaSeconds = clamped / Math.max(1, pxPerSecSv.value);
          runOnJS(onTrimRef.current)(deltaSeconds);
        }

        leftOffset.value = 0;
        widthDelta.value = 0;
        isDragging.value = 0;
        lastSnapTimeSv.value = -1;
        clearTrimSnapGuide();
      })
      .onFinalize(() => {
        leftOffset.value = 0;
        widthDelta.value = 0;
        isDragging.value = 0;
        lastSnapTimeSv.value = -1;
        clearTrimSnapGuide();
      });

    return timelinePan ? pan.blocksExternalGesture(timelinePan) : pan;
  }, [
    boundsSv,
    edge,
    edgeTimeSeconds,
    edgeTimeSv,
    isDragging,
    lastSnapTimeSv,
    leftOffset,
    pxPerSecSv,
    snapTargetsSv,
    timelinePan,
    widthDelta,
  ]);

  return { gesture, leftOffset, widthDelta, isDragging };
}

/** Live left/width while dragging in/out trim handles. */
export function useTimelineTrimPreview(
  baseLeft: number,
  baseWidth: number,
  inLeftOffset: SharedValue<number>,
  inWidthDelta: SharedValue<number>,
  outWidthDelta: SharedValue<number>,
  moveOffset?: SharedValue<number>,
) {
  const baseLeftSv = useSharedValue(baseLeft);
  const baseWidthSv = useSharedValue(baseWidth);

  useEffect(() => {
    baseLeftSv.value = baseLeft;
    baseWidthSv.value = baseWidth;
  }, [baseLeft, baseLeftSv, baseWidth, baseWidthSv]);

  return useAnimatedStyle(() => ({
    left:
      baseLeftSv.value +
      inLeftOffset.value +
      (moveOffset?.value ?? 0),
    width: Math.max(
      MIN_SEGMENT_PX,
      baseWidthSv.value + inWidthDelta.value + outWidthDelta.value,
    ),
    zIndex: moveOffset && moveOffset.value !== 0 ? 6 : 3,
  }));
}
