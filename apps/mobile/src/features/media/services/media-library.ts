import * as MediaLibrary from 'expo-media-library/legacy';

export type LibraryAsset = MediaLibrary.Asset;

export type MediaPickerTab = 'videos' | 'photos' | 'live';

const PAGE_SIZE = 60;

function tabQueryOptions(
  tab: MediaPickerTab,
): Pick<MediaLibrary.AssetsOptions, 'mediaType' | 'mediaSubtypes'> {
  if (tab === 'videos') {
    return { mediaType: MediaLibrary.MediaType.video };
  }
  if (tab === 'live') {
    return {
      mediaType: MediaLibrary.MediaType.photo,
      mediaSubtypes: ['livePhoto'],
    };
  }
  return { mediaType: MediaLibrary.MediaType.photo };
}

export async function requestMediaLibraryAccess(): Promise<boolean> {
  const { granted } = await MediaLibrary.requestPermissionsAsync();
  return granted;
}

export async function fetchMediaPage(
  tab: MediaPickerTab,
  cursor?: string,
): Promise<MediaLibrary.PagedInfo<LibraryAsset>> {
  return MediaLibrary.getAssetsAsync({
    first: PAGE_SIZE,
    after: cursor,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    ...tabQueryOptions(tab),
  });
}

export function formatAssetDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function isVideoAsset(asset: LibraryAsset): boolean {
  return asset.mediaType === 'video' || asset.mediaType === 'pairedVideo';
}
