import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const DRAG_COMMIT_PX = 4;

interface UseTimelineSegmentPanOptions {
  pxPerSecond: number;
  onSelect: () => void;
  onDragEnd: (deltaSeconds: number) => void;
}

/** Horizontal drag on a timeline segment; blocks parent scrub while dragging. */
export function useTimelineSegmentPan({
  pxPerSecond,
  onSelect,
  onDragEnd,
}: UseTimelineSegmentPanOptions) {
  const translateX = useSharedValue(0);
  const pxPerSecSv = useSharedValue(pxPerSecond);

  useEffect(() => {
    pxPerSecSv.value = pxPerSecond;
  }, [pxPerSecond, pxPerSecSv]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-5, 5])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          runOnJS(onSelect)();
        })
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          translateX.value = 0;
          if (Math.abs(e.translationX) < DRAG_COMMIT_PX) {
            return;
          }
          const deltaSeconds = e.translationX / Math.max(1, pxPerSecSv.value);
          runOnJS(onDragEnd)(deltaSeconds);
        }),
    [onDragEnd, onSelect, pxPerSecSv, translateX],
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { gesture, dragStyle };
}
