import type { ImageSource } from 'expo-image';
import type { VideoThumbnail } from 'expo-video';
import type { EditorClip } from './types';

export function nearestVideoThumbnail(
  thumbs: VideoThumbnail[] | undefined,
  sourceTime: number,
): VideoThumbnail | null {
  if (!thumbs?.length) return null;
  return thumbs.reduce((best, thumb) =>
    Math.abs(thumb.requestedTime - sourceTime) < Math.abs(best.requestedTime - sourceTime)
      ? thumb
      : best,
  );
}

/** expo-image blurRadius needs a still frame — video file URIs are not valid sources. */
export function blurBackgroundSourceForClip(
  clip: EditorClip,
  sourceTime: number,
  thumbnails: VideoThumbnail[] | undefined,
  posterFrame: VideoThumbnail | null | undefined,
): ImageSource | null {
  if (clip.mediaType === 'image') {
    return clip.uri ? { uri: clip.uri } : null;
  }

  const frame = nearestVideoThumbnail(thumbnails, sourceTime) ?? posterFrame ?? null;
  return frame;
}
