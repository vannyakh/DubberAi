import { useEffect, useRef, useState } from 'react';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { loadPlayerSource } from '../services/video-playback';
import { EditorClip } from '../types';

async function generatePoster(clip: EditorClip): Promise<VideoThumbnail | null> {
  const player = createVideoPlayer(null);
  try {
    const time = Math.max(0, clip.trimStart);
    await loadPlayerSource(player, clip.uri, time, clip.libraryAssetId);
    const thumbs = await player.generateThumbnailsAsync([time], {
      maxWidth: 720,
      maxHeight: 720,
    });
    return thumbs[0] ?? null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}

/** One still frame per video clip for blur fill before the filmstrip is ready. */
export function useClipPosterFrames(
  clips: EditorClip[],
  thumbnails: Record<string, VideoThumbnail[]>,
) {
  const [posters, setPosters] = useState<Record<string, VideoThumbnail>>({});
  const cacheRef = useRef(posters);
  cacheRef.current = posters;
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    for (const clip of clips) {
      if (clip.mediaType === 'image') continue;
      const key = clip.uri;
      if (thumbnails[key]?.length || cacheRef.current[key] || inFlight.current.has(key)) continue;

      inFlight.current.add(key);
      generatePoster(clip)
        .then((poster) => {
          if (!poster) return;
          setPosters((prev) => (prev[key] ? prev : { ...prev, [key]: poster }));
        })
        .finally(() => inFlight.current.delete(key));
    }
  }, [clips, thumbnails]);

  return posters;
}
