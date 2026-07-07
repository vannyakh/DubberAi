import { useCallback, useState } from 'react';
import {
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const OPEN_MS = 320;
const CLOSE_MS = 300;

const OPEN_EASING = Easing.out(Easing.cubic);
const CLOSE_EASING = Easing.in(Easing.cubic);

/** Reanimated shared-value driven open/close for editor tool sub-sheets. */
export function useToolsBottomSheet() {
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  const open = useCallback(() => {
    setMounted(true);
    progress.value = withTiming(1, {
      duration: OPEN_MS,
      easing: OPEN_EASING,
    });
  }, [progress]);

  const close = useCallback((onComplete?: () => void) => {
    progress.value = withTiming(
      0,
      {
        duration: CLOSE_MS,
        easing: CLOSE_EASING,
      },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
          if (onComplete) {
            runOnJS(onComplete)();
          }
        }
      },
    );
  }, [progress]);

  return { progress, open, close, mounted };
}
