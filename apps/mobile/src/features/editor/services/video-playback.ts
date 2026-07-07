import * as MediaLibrary from 'expo-media-library/legacy';
import type { Asset as LibraryAsset } from 'expo-media-library/legacy';
import type { VideoPlayer } from 'expo-video';
import type { EditorClip } from '../types';

const PLAYER_READY_TIMEOUT_MS = 12_000;

const ASSET_INFO_OPTIONS = { shouldDownloadFromNetwork: true } as const;

function isDirectPlayableUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

function normalizeLocalUri(uri: string): string {
  const stripped = uri.split('#')[0] ?? uri;
  if (isDirectPlayableUri(stripped) || stripped.startsWith('ph://') || stripped.startsWith('assets-library://')) {
    return stripped;
  }
  if (stripped.startsWith('/')) return `file://${stripped}`;
  return stripped;
}

/** Resolves a library picker asset to a file:// URI expo-video can decode. */
export async function resolveLibraryAssetUri(asset: LibraryAsset): Promise<string> {
  if (isDirectPlayableUri(asset.uri)) return asset.uri;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset, ASSET_INFO_OPTIONS);
    if (info.localUri) return normalizeLocalUri(info.localUri);
  } catch {
    // Fall back to the library uri.
  }

  return asset.uri;
}

export async function resolvePlayableUri(
  uri: string,
  libraryAssetId?: string,
): Promise<string> {
  if (isDirectPlayableUri(uri)) return normalizeLocalUri(uri);

  if (libraryAssetId) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(libraryAssetId, ASSET_INFO_OPTIONS);
      if (info.localUri) return normalizeLocalUri(info.localUri);
    } catch {
      // Try other strategies below.
    }
  }

  return uri;
}

export async function waitForPlayerReady(player: VideoPlayer): Promise<void> {
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

export async function loadPlayerSource(
  player: VideoPlayer,
  uri: string,
  startTime: number,
  libraryAssetId?: string,
): Promise<void> {
  const playableUri = await resolvePlayableUri(uri, libraryAssetId);
  await player.replaceAsync(playableUri);
  await waitForPlayerReady(player);
  player.currentTime = startTime;
}

/** Re-resolve library URIs for clips restored from disk. */
export async function rehydrateClipPlayableUris(clips: EditorClip[]): Promise<EditorClip[]> {
  return Promise.all(
    clips.map(async (clip) => {
      const uri = await resolvePlayableUri(clip.uri, clip.libraryAssetId);
      return uri === clip.uri ? clip : { ...clip, uri };
    }),
  );
}
