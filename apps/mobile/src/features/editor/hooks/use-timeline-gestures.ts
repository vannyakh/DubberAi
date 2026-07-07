import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { useEditorStore } from '../editor-store';
import {
  clampPxPerSecond,
  TIMELINE_MAX_PX_PER_SEC,
  TIMELINE_MIN_PX_PER_SEC,
} from '../timeline-utils';
import { timelineDuration } from '../types';

interface Options {
  tracksWidth: number;
  totalDuration: number;
  pxPerSecond: number;
  playhead: number;
  isPlaying: boolean;
  setPlayhead: (seconds: number) => void;
  setPlaying: (playing: boolean) => void;
  setPxPerSecond: (px: number) => void;
}

const SCRUB_MIN_DELTA_PX = 0.2;
const SCRUB_THROTTLE_MS = 16;

function clampPxWorklet(px: number): number {
  'worklet';
  return Math.max(TIMELINE_MIN_PX_PER_SEC, Math.min(TIMELINE_MAX_PX_PER_SEC, px));
}

function clampScroll(offsetX: number, max: number): number {
  'worklet';
  return Math.max(0, Math.min(max, offsetX));
}

export function useTimelineGestures({
  tracksWidth,
  totalDuration,
  pxPerSecond,
  playhead,
  isPlaying,
  setPlayhead,
  setPlaying,
  setPxPerSecond,
}: Options) {
  const sidePad = tracksWidth / 2;
  const isDragging = useRef(false);
  const lastScrubAt = useRef(0);
  const lastZoomCommitAt = useRef(0);

  const scrollX = useSharedValue(playhead * pxPerSecond);
  const panStartX = useSharedValue(0);
  const pinchBasePx = useSharedValue(pxPerSecond);
  const pinchAnchorTime = useSharedValue(0);
  const pxPerSecSv = useSharedValue(pxPerSecond);
  const totalDurSv = useSharedValue(totalDuration);
  const playheadSv = useSharedValue(playhead);
  const isPlayingSv = useSharedValue(isPlaying);
  const isDraggingSv = useSharedValue(false);
  const isMomentumSv = useSharedValue(false);

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
    totalDurSv.value = totalDuration;
  }, [pxPerSecond, totalDuration, pxPerSecSv, totalDurSv]);

  useEffect(() => {
    isPlayingSv.value = isPlaying;
  }, [isPlaying, isPlayingSv]);

  useEffect(() => {
    playheadSv.value = playhead;
    if (isDragging.current || isPlaying || isMomentumSv.value) return;
    scrollX.value = withTiming(playhead * pxPerSecond, { duration: 140 });
  }, [playhead, pxPerSecond, isPlaying, playheadSv, scrollX, isMomentumSv]);

  useAnimatedReaction(
    () => {
      if (!isPlayingSv.value || isDraggingSv.value || isMomentumSv.value) return -1;
      return playheadSv.value * pxPerSecSv.value;
    },
    (target, prev) => {
      if (target < 0) return;
      if (prev != null && Math.abs(target - prev) < 0.25) return;
      scrollX.value = target;
    },
    [playheadSv, pxPerSecSv, isPlayingSv, isDraggingSv, isMomentumSv],
  );

  const scrub = useCallback(
    (offsetX: number) => {
      const { pxPerSecond: px, clips } = useEditorStore.getState();
      const duration = timelineDuration(clips);
      setPlayhead(Math.max(0, Math.min(duration, offsetX / clampPxPerSecond(px))));
    },
    [setPlayhead],
  );

  const scrubThrottled = useCallback(
    (offsetX: number) => {
      const now = Date.now();
      if (now - lastScrubAt.current < SCRUB_THROTTLE_MS) return;
      lastScrubAt.current = now;
      scrub(offsetX);
    },
    [scrub],
  );

  const beginDrag = useCallback(() => {
    isDragging.current = true;
    isMomentumSv.value = false;
    setPlaying(false);
  }, [isMomentumSv, setPlaying]);

  const endDrag = useCallback(
    (offsetX: number) => {
      isDragging.current = false;
      lastScrubAt.current = 0;
      scrub(offsetX);
    },
    [scrub],
  );

  const finishDrag = useCallback(() => {
    isDragging.current = false;
    isDraggingSv.value = false;
  }, [isDraggingSv]);

  const finishMomentum = useCallback(
    (offsetX: number) => {
      isMomentumSv.value = false;
      lastScrubAt.current = 0;
      scrub(offsetX);
    },
    [isMomentumSv, scrub],
  );

  useAnimatedReaction(
    () => {
      if (!isDraggingSv.value && !isMomentumSv.value) return -1;
      return scrollX.value;
    },
    (offsetX, prev) => {
      if (offsetX < 0) return;
      if (prev != null && Math.abs(offsetX - prev) < SCRUB_MIN_DELTA_PX) return;
      const max = totalDurSv.value * pxPerSecSv.value;
      runOnJS(scrubThrottled)(clampScroll(offsetX, max));
    },
    [isDraggingSv, isMomentumSv, pxPerSecSv, scrollX, totalDurSv],
  );

  const applyLiveZoom = useCallback(
    (nextPx: number, offsetX: number) => {
      setPxPerSecond(nextPx);
      const { clips } = useEditorStore.getState();
      const duration = timelineDuration(clips);
      setPlayhead(Math.max(0, Math.min(duration, offsetX / nextPx)));
    },
    [setPlayhead, setPxPerSecond],
  );

  const commitZoom = useCallback(
    (nextPx: number, offsetX: number) => {
      isDragging.current = false;
      isDraggingSv.value = false;
      applyLiveZoom(nextPx, offsetX);
    },
    [applyLiveZoom, isDraggingSv],
  );

  const applyLiveZoomThrottled = useCallback(
    (nextPx: number, offsetX: number) => {
      const now = Date.now();
      if (now - lastZoomCommitAt.current < 48) return;
      lastZoomCommitAt.current = now;
      applyLiveZoom(nextPx, offsetX);
    },
    [applyLiveZoom],
  );

  const gestures = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-20, 20])
      .onBegin(() => {
        isMomentumSv.value = false;
        isDraggingSv.value = true;
        panStartX.value = scrollX.value;
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        const max = totalDurSv.value * pxPerSecSv.value;
        scrollX.value = clampScroll(panStartX.value - e.translationX, max);
      })
      .onEnd((e) => {
        const max = totalDurSv.value * pxPerSecSv.value;
        const clamped = clampScroll(scrollX.value, max);
        scrollX.value = clamped;

        const velocity = -e.velocityX;
        if (Math.abs(velocity) > 80) {
          isMomentumSv.value = true;
          scrollX.value = withDecay({ velocity, clamp: [0, max] }, (finished) => {
            if (finished) {
              runOnJS(finishMomentum)(scrollX.value);
            }
          });
          return;
        }

        runOnJS(endDrag)(clamped);
      })
      .onFinalize(() => {
        isDraggingSv.value = false;
        runOnJS(finishDrag)();
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        isMomentumSv.value = false;
        isDraggingSv.value = true;
        pinchBasePx.value = pxPerSecSv.value;
        pinchAnchorTime.value = scrollX.value / Math.max(1, pxPerSecSv.value);
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        const nextPx = clampPxWorklet(pinchBasePx.value * e.scale);
        const max = totalDurSv.value * nextPx;
        scrollX.value = clampScroll(pinchAnchorTime.value * nextPx, max);
        runOnJS(applyLiveZoomThrottled)(nextPx, scrollX.value);
      })
      .onEnd((e) => {
        const nextPx = clampPxWorklet(pinchBasePx.value * e.scale);
        const max = totalDurSv.value * nextPx;
        const nextScroll = clampScroll(pinchAnchorTime.value * nextPx, max);
        scrollX.value = nextScroll;
        runOnJS(commitZoom)(nextPx, nextScroll);
      })
      .onFinalize(() => {
        isDraggingSv.value = false;
        runOnJS(finishDrag)();
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [
    applyLiveZoomThrottled,
    beginDrag,
    commitZoom,
    endDrag,
    finishDrag,
    finishMomentum,
    isDraggingSv,
    isMomentumSv,
    panStartX,
    pinchAnchorTime,
    pinchBasePx,
    pxPerSecSv,
    scrollX,
    totalDurSv,
  ]);

  const contentShift = useAnimatedStyle(() => ({
    transform: [{ translateX: sidePad - scrollX.value }],
  }));

  return {
    sidePad,
    gestures,
    contentShift,
    isDragging,
  };
}
