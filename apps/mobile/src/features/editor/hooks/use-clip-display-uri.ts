import { useEffect, useRef, useState } from 'react';
import { resolvePlayableUri } from '../services/video-playback';
import { EditorClip } from '../types';

/** Resolves library asset URIs for expo-image timeline previews. */
export function useClipDisplayUris(clips: EditorClip[]) {
  const [uris, setUris] = useState<Record<string, string>>({});
  const cacheRef = useRef(uris);
  cacheRef.current = uris;

  useEffect(() => {
    for (const clip of clips) {
      const key = clip.uri;
      if (cacheRef.current[key]) continue;
      resolvePlayableUri(key, clip.libraryAssetId).then((resolved) => {
        setUris((prev) => (prev[key] ? prev : { ...prev, [key]: resolved }));
      });
    }
  }, [clips]);

  return uris;
}
