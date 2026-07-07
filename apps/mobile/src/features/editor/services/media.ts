import * as MediaLibrary from 'expo-media-library/legacy';
import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import { isVideoAsset } from '@/features/media';
import { getAudioWaveform, getVideoInfo } from '../../../../modules/dubber-media';
import { DEFAULT_CLIP_CONTENT_TRANSFORM, EditorClip } from '../types';
import { resolveLibraryAssetUri } from './video-playback';

const IMAGE_CLIP_DURATION = 5;
const IMAGE_WAVEFORM = Array.from({ length: 256 }, () => 0.08);

function newClipId(): string {
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clipDurationSeconds(infoDuration: number | undefined, fallbackSeconds: number): number {
  const duration = infoDuration ?? fallbackSeconds;
  return duration > 0 ? duration : Math.max(fallbackSeconds, 1);
}

function buildImageClip(
  uri: string,
  libraryAssetId: string | undefined,
  width: number,
  height: number,
): EditorClip {
  const duration = IMAGE_CLIP_DURATION;
  return {
    id: newClipId(),
    uri,
    libraryAssetId,
    mediaType: 'image',
    sourceDuration: duration,
    trimStart: 0,
    trimEnd: duration,
    width,
    height,
    hasAudio: false,
    waveform: IMAGE_WAVEFORM,
    filterId: 'none',
    muted: false,
    ...DEFAULT_CLIP_CONTENT_TRANSFORM,
  };
}

async function buildVideoClip(
  uri: string,
  libraryAssetId: string | undefined,
  fallbackDuration: number,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<EditorClip> {
  const [info, waveform] = await Promise.all([
    getVideoInfo(uri),
    getAudioWaveform(uri, 512),
  ]);
  const duration = clipDurationSeconds(info?.duration, fallbackDuration);

  return {
    id: newClipId(),
    uri,
    libraryAssetId,
    mediaType: 'video',
    sourceDuration: duration,
    trimStart: 0,
    trimEnd: duration,
    width: info?.width ?? fallbackWidth,
    height: info?.height ?? fallbackHeight,
    hasAudio: info?.hasAudio ?? true,
    waveform,
    filterId: 'none',
    muted: false,
    ...DEFAULT_CLIP_CONTENT_TRANSFORM,
  };
}

export async function clipsFromLibraryAssets(assets: LibraryAsset[]): Promise<EditorClip[]> {
  return Promise.all(assets.map(libraryAssetToClip));
}

async function libraryAssetToClip(asset: LibraryAsset): Promise<EditorClip> {
  const playableUri = await resolveLibraryAssetUri(asset);

  if (isVideoAsset(asset)) {
    return buildVideoClip(
      playableUri,
      asset.id,
      asset.duration ?? 0,
      asset.width ?? 0,
      asset.height ?? 0,
    );
  }

  return buildImageClip(
    playableUri,
    asset.id,
    asset.width ?? 1080,
    asset.height ?? 1920,
  );
}

/** Saves the exported file into the user's photo library. */
export async function saveToLibrary(fileUri: string): Promise<void> {
  const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!granted) {
    throw new Error('Photo library permission is required to save the export.');
  }
  await MediaLibrary.saveToLibraryAsync(fileUri);
}
