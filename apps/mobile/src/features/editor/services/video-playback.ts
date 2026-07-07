import * as MediaLibrary from 'expo-media-library/legacy';
import type { VideoPlayer } from 'expo-video';

const PLAYER_READY_TIMEOUT_MS = 12_000;

export async function resolvePlayableUri(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  try {
    const info = await MediaLibrary.getAssetInfoAsync(uri);
    if (info.localUri) return info.localUri;
  } catch {
    // Fall back to the library uri.
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
): Promise<void> {
  const playableUri = await resolvePlayableUri(uri);
  await player.replaceAsync(playableUri);
  await waitForPlayerReady(player);
  player.currentTime = startTime;
}
