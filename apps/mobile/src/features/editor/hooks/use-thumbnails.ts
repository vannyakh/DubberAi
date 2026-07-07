import { useEffect, useRef, useState } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { EditorClip } from '../types';

const MAX_THUMBS_PER_CLIP = 90;
const PLAYER_READY_TIMEOUT_MS = 12_000;

async function resolvePlayableUri(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  try {
    const info = await MediaLibrary.getAssetInfoAsync(uri);
    if (info.localUri) return info.localUri;
  } catch {
    // Fall back to the library uri (works for expo-image on iOS).
  }
  return uri;
}

async function waitForPlayerReady(player: ReturnType<typeof createVideoPlayer>): Promise<void> {
  if (player.status === 'readyToPlay') return;

  await new Promise<void>((resolve, reject) => {
    let sub: { remove: () => void } | null = null;
    const timeout = setTimeout(() => {
      sub?.remove();
      reject(new Error('Timed out waiting for video to load'));
    }, PLAYER_READY_TIMEOUT_MS);

    sub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        clearTimeout(timeout);
        sub?.remove();
        resolve();
      } else if (status === 'error') {
        clearTimeout(timeout);
        sub?.remove();
        reject(error ?? new Error('Failed to load video'));
      }
    });
  });
}

async function generateForClip(clip: EditorClip): Promise<VideoThumbnail[]> {
  if (clip.mediaType === 'image') return [];

  const playableUri = await resolvePlayableUri(clip.uri);
  const step = Math.max(0.25, clip.sourceDuration / MAX_THUMBS_PER_CLIP);
  const times: number[] = [];
  for (let t = 0; t < clip.sourceDuration; t += step) times.push(t);
  if (times.length === 0) times.push(0);

  const player = createVideoPlayer(playableUri);
  try {
    await waitForPlayerReady(player);
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
