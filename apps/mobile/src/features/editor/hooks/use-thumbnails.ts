import { useEffect, useRef, useState } from 'react';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { EditorClip } from '../types';

const MAX_THUMBS_PER_CLIP = 90;

async function generateForClip(clip: EditorClip): Promise<VideoThumbnail[]> {
  const step = Math.max(1, clip.sourceDuration / MAX_THUMBS_PER_CLIP);
  const times: number[] = [];
  for (let t = 0; t < clip.sourceDuration; t += step) times.push(t);
  if (times.length === 0) times.push(0);

  // Offscreen player: expo-video generates thumbnails from the loaded asset.
  const player = createVideoPlayer(clip.uri);
  try {
    await new Promise<void>((resolve, reject) => {
      if (player.status === 'readyToPlay') return resolve();
      const sub = player.addListener('statusChange', ({ status, error }) => {
        if (status === 'readyToPlay') {
          sub.remove();
          resolve();
        } else if (status === 'error') {
          sub.remove();
          reject(error ?? new Error('Failed to load video'));
        }
      });
    });
    return await player.generateThumbnailsAsync(times, { maxWidth: 120, maxHeight: 120 });
  } finally {
    player.release();
  }
}

/**
 * Generates and caches filmstrip thumbnails per clip (keyed by source uri, so
 * trims/splits reuse the same strip). Thumbnails are native image refs
 * consumable directly by expo-image without base64 round-trips.
 */
export function useClipThumbnails(clips: EditorClip[]) {
  const [thumbnails, setThumbnails] = useState<Record<string, VideoThumbnail[]>>({});
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    for (const clip of clips) {
      if (thumbnails[clip.uri] || inFlight.current.has(clip.uri)) continue;
      inFlight.current.add(clip.uri);
      generateForClip(clip)
        .then((thumbs) => setThumbnails((prev) => ({ ...prev, [clip.uri]: thumbs })))
        .catch(() => {
          // Leave the strip empty; cells fall back to a flat color.
        })
        .finally(() => inFlight.current.delete(clip.uri));
    }
  }, [clips, thumbnails]);

  return thumbnails;
}
