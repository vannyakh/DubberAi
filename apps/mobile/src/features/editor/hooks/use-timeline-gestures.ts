import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
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

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
    totalDurSv.value = totalDuration;
  }, [pxPerSecond, totalDuration, pxPerSecSv, totalDurSv]);

  useEffect(() => {
    isPlayingSv.value = isPlaying;
  }, [isPlaying, isPlayingSv]);

  useEffect(() => {
    playheadSv.value = playhead;
    if (isDragging.current || isPlaying) return;
    scrollX.value = withTiming(playhead * pxPerSecond, { duration: 140 });
  }, [playhead, pxPerSecond, isPlaying, playheadSv, scrollX]);

  useAnimatedReaction(
    () => {
      if (!isPlayingSv.value || isDraggingSv.value) return -1;
      return playheadSv.value * pxPerSecSv.value;
    },
    (target, prev) => {
      if (target < 0) return;
      if (prev != null && Math.abs(target - prev) < 0.25) return;
      scrollX.value = target;
    },
    [playheadSv, pxPerSecSv, isPlayingSv, isDraggingSv],
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
      if (now - lastScrubAt.current < 32) return;
      lastScrubAt.current = now;
      scrub(offsetX);
    },
    [scrub],
  );

  const beginDrag = useCallback(() => {
    isDragging.current = true;
    setPlaying(false);
  }, [setPlaying]);

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
      .activeOffsetX([-6, 6])
      .failOffsetY([-20, 20])
      .onBegin(() => {
        isDraggingSv.value = true;
        panStartX.value = scrollX.value;
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        const max = totalDurSv.value * pxPerSecSv.value;
        // Finger follows content: drag right → timeline moves right → earlier time.
        scrollX.value = clampScroll(panStartX.value - e.translationX, max);
        runOnJS(scrubThrottled)(scrollX.value);
      })
      .onEnd(() => {
        runOnJS(endDrag)(scrollX.value);
      })
      .onFinalize(() => {
        isDraggingSv.value = false;
        runOnJS(finishDrag)();
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
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
    isDraggingSv,
    panStartX,
    pinchAnchorTime,
    pinchBasePx,
    pxPerSecSv,
    scrollX,
    scrubThrottled,
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
