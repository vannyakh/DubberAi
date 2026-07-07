import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Inline clamp for worklet context (no JS function calls). */
function clampPxWorklet(px: number): number {
  'worklet';
  return Math.max(TIMELINE_MIN_PX_PER_SEC, Math.min(TIMELINE_MAX_PX_PER_SEC, px));
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

  const scrollX = useSharedValue(playhead * pxPerSecond);
  const panStartX = useSharedValue(0);
  const pinchBasePx = useSharedValue(pxPerSecond);
  const pinchAnchorTime = useSharedValue(0);
  const pxPerSecSv = useSharedValue(pxPerSecond);
  const totalDurSv = useSharedValue(totalDuration);

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
    totalDurSv.value = totalDuration;
  }, [pxPerSecond, totalDuration, pxPerSecSv, totalDurSv]);

  const scrub = useCallback(
    (offsetX: number) => {
      const { pxPerSecond: px, clips } = useEditorStore.getState();
      const duration = timelineDuration(clips);
      setPlayhead(Math.max(0, Math.min(duration, offsetX / clampPxPerSecond(px))));
    },
    [setPlayhead],
  );

  const beginDrag = useCallback(() => {
    isDragging.current = true;
    setPlaying(false);
  }, [setPlaying]);

  const endDrag = useCallback(
    (offsetX: number) => {
      isDragging.current = false;
      scrub(offsetX);
    },
    [scrub],
  );

  const finishDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const commitZoom = useCallback(
    (nextPx: number, offsetX: number) => {
      isDragging.current = false;
      setPxPerSecond(nextPx);
      const { clips } = useEditorStore.getState();
      const duration = timelineDuration(clips);
      setPlayhead(Math.max(0, Math.min(duration, offsetX / nextPx)));
    },
    [setPlayhead, setPxPerSecond],
  );

  const [scrollOffset, setScrollOffset] = useState(playhead * pxPerSecond);
  const updateScrollOffset = useCallback((x: number) => {
    setScrollOffset(x);
  }, []);

  useEffect(() => {
    if (isDragging.current) return;
    scrollX.value = withTiming(playhead * pxPerSecond, { duration: isPlaying ? 0 : 80 });
  }, [playhead, pxPerSecond, isPlaying, scrollX]);

  const gestures = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-14, 14])
      .onBegin(() => {
        panStartX.value = scrollX.value;
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        const max = totalDurSv.value * pxPerSecSv.value;
        scrollX.value = Math.max(0, Math.min(max, panStartX.value + e.translationX));
        runOnJS(scrub)(scrollX.value);
      })
      .onEnd(() => {
        runOnJS(endDrag)(scrollX.value);
      })
      .onFinalize(() => {
        runOnJS(finishDrag)();
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        pinchBasePx.value = pxPerSecSv.value;
        pinchAnchorTime.value = scrollX.value / Math.max(1, pxPerSecSv.value);
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        const nextPx = clampPxWorklet(pinchBasePx.value * e.scale);
        const max = totalDurSv.value * nextPx;
        scrollX.value = Math.max(0, Math.min(max, pinchAnchorTime.value * nextPx));
      })
      .onEnd((e) => {
        const nextPx = clampPxWorklet(pinchBasePx.value * e.scale);
        const max = totalDurSv.value * nextPx;
        const nextScroll = Math.max(0, Math.min(max, pinchAnchorTime.value * nextPx));
        scrollX.value = nextScroll;
        runOnJS(commitZoom)(nextPx, nextScroll);
      })
      .onFinalize(() => {
        runOnJS(finishDrag)();
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [beginDrag, scrub, endDrag, finishDrag, commitZoom]);

  useAnimatedReaction(
    () => scrollX.value,
    (x) => {
      runOnJS(updateScrollOffset)(x);
    },
  );

  const contentShift = useAnimatedStyle(() => ({
    transform: [{ translateX: sidePad - scrollX.value }],
  }));

  return {
    sidePad,
    scrollOffset,
    gestures,
    contentShift,
    isDragging,
  };
}
