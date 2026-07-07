import { useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import {
  triggerTimelineTrimGrabHaptic,
  triggerTimelineTrimSnapHaptic,
} from '../services/timeline-trim-haptics';
import {
  resolveMoveTranslation,
  timelineTrimSnapLineX,
} from '../timeline-trim-snap';
import { useTimelinePanGesture } from '../timeline-pan-gesture-context';

const DRAG_COMMIT_PX = 3;

interface UseTimelineOverlayMoveOptions {
  pxPerSecond: number;
  startTimeSeconds: number;
  snapTargets: number[];
  onSelect: () => void;
  onMove: (deltaSeconds: number) => void;
}

function clearTrimSnapGuide() {
  'worklet';
  timelineTrimSnapLineX.value = -1;
}

/** Horizontal drag on an overlay body to reposition it on the timeline. */
export function useTimelineOverlayMove({
  pxPerSecond,
  startTimeSeconds,
  snapTargets,
  onSelect,
  onMove,
}: UseTimelineOverlayMoveOptions) {
  const translateX = useSharedValue(0);
  const isMoving = useSharedValue(0);
  const pxPerSecSv = useSharedValue(pxPerSecond);
  const startTimeSv = useSharedValue(startTimeSeconds);
  const snapTargetsSv = useSharedValue<number[]>(snapTargets);
  const lastSnapTimeSv = useSharedValue(-1);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const timelinePan = useTimelinePanGesture();

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
  }, [pxPerSecond, pxPerSecSv]);

  useEffect(() => {
    startTimeSv.value = startTimeSeconds;
  }, [startTimeSeconds, startTimeSv]);

  useEffect(() => {
    snapTargetsSv.value = snapTargets;
  }, [snapTargets, snapTargetsSv]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-16, 16])
      .onBegin(() => {
        isMoving.value = 1;
        startTimeSv.value = startTimeSeconds;
        lastSnapTimeSv.value = -1;
        runOnJS(onSelectRef.current)();
        runOnJS(triggerTimelineTrimGrabHaptic)();
      })
      .onUpdate((e) => {
        const resolved = resolveMoveTranslation(
          e.translationX,
          pxPerSecSv.value,
          startTimeSv.value,
          snapTargetsSv.value,
        );
        translateX.value = resolved.translationX;
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
        const resolved = resolveMoveTranslation(
          e.translationX,
          pxPerSecSv.value,
          startTimeSv.value,
          snapTargetsSv.value,
        );

        if (Math.abs(resolved.translationX) >= DRAG_COMMIT_PX) {
          const deltaSeconds = resolved.translationX / Math.max(1, pxPerSecSv.value);
          runOnJS(onMoveRef.current)(deltaSeconds);
        }

        translateX.value = 0;
        isMoving.value = 0;
        lastSnapTimeSv.value = -1;
        clearTrimSnapGuide();
      })
      .onFinalize(() => {
        translateX.value = 0;
        isMoving.value = 0;
        lastSnapTimeSv.value = -1;
        clearTrimSnapGuide();
      });

    return timelinePan ? pan.blocksExternalGesture(timelinePan) : pan;
  }, [
    isMoving,
    lastSnapTimeSv,
    pxPerSecSv,
    snapTargetsSv,
    startTimeSeconds,
    startTimeSv,
    timelinePan,
    translateX,
  ]);

  return { gesture, translateX, isMoving };
}
