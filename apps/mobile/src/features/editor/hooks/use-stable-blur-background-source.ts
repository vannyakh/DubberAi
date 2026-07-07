import { useRef } from 'react';
import type { ImageSource } from 'expo-image';

/**
 * Blur fill only needs a coarse still — updating every playhead tick is expensive.
 * Freeze while playing; refresh when paused or when the active clip changes.
 */
export function useStableBlurBackgroundSource(
  source: ImageSource | null,
  clipKey: string,
  isPlaying: boolean,
): ImageSource | null {
  const cache = useRef<{ clipKey: string; source: ImageSource | null }>({
    clipKey: '',
    source: null,
  });

  if (!isPlaying) {
    cache.current = { clipKey, source };
    return source;
  }

  if (clipKey !== cache.current.clipKey) {
    cache.current = { clipKey, source };
    return source;
  }

  if (!cache.current.source && source) {
    cache.current = { clipKey, source };
    return source;
  }

  return cache.current.source ?? source;
}
