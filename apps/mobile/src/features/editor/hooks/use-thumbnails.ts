import { useEffect, useRef, useState } from 'react';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { loadPlayerSource } from '../services/video-playback';
import { EditorClip } from '../types';

const MAX_THUMBS_PER_CLIP = 90;

async function generateForClip(clip: EditorClip): Promise<VideoThumbnail[]> {
  if (clip.mediaType === 'image') return [];

  const step = Math.max(0.25, clip.sourceDuration / MAX_THUMBS_PER_CLIP);
  const times: number[] = [];
  for (let t = 0; t < clip.sourceDuration; t += step) times.push(t);
  if (times.length === 0) times.push(0);

  const player = createVideoPlayer(null);
  try {
    await loadPlayerSource(player, clip.uri, 0);
    return await player.generateThumbnailsAsync(times, { maxWidth: 120, maxHeight: 120 });
  } finally {
    player.release();
  }
}

/**
 * Generates and caches filmstrip thumbnails per clip (keyed by source uri, so
 * trims/splits reuse the same strip). Image clips use their uri directly in
 * the timeline; this hook only generates frames for video sources.
 */
export function useClipThumbnails(clips: EditorClip[]) {
  const [thumbnails, setThumbnails] = useState<Record<string, VideoThumbnail[]>>({});
  const cacheRef = useRef(thumbnails);
  cacheRef.current = thumbnails;
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    for (const clip of clips) {
      if (clip.mediaType === 'image') continue;
      const key = clip.uri;
      if (cacheRef.current[key]?.length || inFlight.current.has(key)) continue;

      inFlight.current.add(key);
      generateForClip(clip)
        .then((thumbs) => {
          if (thumbs.length === 0) return;
          setThumbnails((prev) => ({ ...prev, [key]: thumbs }));
        })
        .finally(() => inFlight.current.delete(key));
    }
  }, [clips]);

  return thumbnails;
}
