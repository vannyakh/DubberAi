import { useEffect, useRef, useState } from 'react';
import { resolvePlayableUri } from '../services/video-playback';
import { MediaOverlay } from '../types';

/** Resolves library asset URIs for media overlay preview/timeline. */
export function useMediaOverlayDisplayUris(overlays: MediaOverlay[]) {
  const [uris, setUris] = useState<Record<string, string>>({});
  const cacheRef = useRef(uris);
  cacheRef.current = uris;

  useEffect(() => {
    for (const overlay of overlays) {
      const key = overlay.uri;
      if (cacheRef.current[key]) continue;
      resolvePlayableUri(key, overlay.libraryAssetId).then((resolved) => {
        setUris((prev) => (prev[key] ? prev : { ...prev, [key]: resolved }));
      });
    }
  }, [overlays]);

  return uris;
}
