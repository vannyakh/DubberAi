import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import {
  DEFAULT_MEDIA_OVERLAY_TRANSFORM,
  EditorClip,
  MediaOverlay,
} from '../types';
import { clipsFromLibraryAssets } from './media';

const IMAGE_OVERLAY_SECONDS = 5;
const MAX_VIDEO_OVERLAY_SECONDS = 15;

function clipToMediaOverlay(
  clip: EditorClip,
  startTime: number,
  trackIndex: number,
): MediaOverlay {
  const visible =
    clip.mediaType === 'image'
      ? IMAGE_OVERLAY_SECONDS
      : Math.min(clip.sourceDuration, MAX_VIDEO_OVERLAY_SECONDS);

  return {
    id: `media-overlay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    uri: clip.uri,
    libraryAssetId: clip.libraryAssetId,
    mediaType: clip.mediaType,
    sourceDuration: clip.sourceDuration,
    trimStart: 0,
    trimEnd: visible,
    width: clip.width,
    height: clip.height,
    startTime,
    trackIndex,
    ...DEFAULT_MEDIA_OVERLAY_TRANSFORM,
  };
}

export async function mediaOverlayFromLibraryAsset(
  asset: LibraryAsset,
  startTime: number,
  trackIndex = 0,
): Promise<MediaOverlay | null> {
  const clips = await clipsFromLibraryAssets([asset]);
  const clip = clips[0];
  if (!clip) return null;
  return clipToMediaOverlay(clip, startTime, trackIndex);
}

/** Minimal clip shape for thumbnail/poster generation keyed by uri. */
export function mediaOverlayPosterClip(overlay: MediaOverlay): EditorClip {
  return {
    id: overlay.id,
    uri: overlay.uri,
    libraryAssetId: overlay.libraryAssetId,
    mediaType: overlay.mediaType,
    sourceDuration: overlay.sourceDuration,
    trimStart: overlay.trimStart,
    trimEnd: overlay.trimEnd,
    width: overlay.width,
    height: overlay.height,
    hasAudio: false,
    waveform: [],
    filterId: 'none',
    muted: true,
    contentScale: 1,
    contentOffsetX: 0,
    contentOffsetY: 0,
    contentRotation: 0,
  };
}
