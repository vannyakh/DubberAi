import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { getAudioWaveform, getVideoInfo } from '../../../../modules/dubber-media';
import { EditorClip } from '../types';

const IMAGE_CLIP_DURATION = 5;

function isVideoAsset(asset: ImagePicker.ImagePickerAsset): boolean {
  if (asset.type === 'video') return true;
  const mime = asset.mimeType?.toLowerCase() ?? '';
  return mime.startsWith('video/');
}

async function assetToClip(asset: ImagePicker.ImagePickerAsset): Promise<EditorClip> {
  const id = `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  if (isVideoAsset(asset)) {
    const [info, waveform] = await Promise.all([
      getVideoInfo(asset.uri),
      getAudioWaveform(asset.uri, 512),
    ]);
    const duration = info?.duration ?? (asset.duration ? asset.duration / 1000 : 0);

    return {
      id,
      uri: asset.uri,
      mediaType: 'video',
      sourceDuration: duration,
      trimStart: 0,
      trimEnd: duration,
      width: info?.width ?? asset.width ?? 0,
      height: info?.height ?? asset.height ?? 0,
      hasAudio: info?.hasAudio ?? true,
      waveform,
    };
  }

  const duration = IMAGE_CLIP_DURATION;
  const flatWave = Array.from({ length: 256 }, () => 0.08);

  return {
    id,
    uri: asset.uri,
    mediaType: 'image',
    sourceDuration: duration,
    trimStart: 0,
    trimEnd: duration,
    width: asset.width ?? 1080,
    height: asset.height ?? 1920,
    hasAudio: false,
    waveform: flatWave,
  };
}

/** Opens the library for videos and still images; returns one clip or null. */
export async function importVideoClip(): Promise<EditorClip | null> {
  const clips = await pickFootageClips(false);
  return clips[0] ?? null;
}

/** Pick videos and/or images from the photo library. */
export async function pickFootageClips(allowMultiple = true): Promise<EditorClip[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos', 'images'],
    allowsMultipleSelection: allowMultiple,
    quality: 1,
    videoMaxDuration: 600,
  });

  if (result.canceled || result.assets.length === 0) return [];

  return Promise.all(result.assets.map(assetToClip));
}

/** Saves the exported file into the user's photo library. */
export async function saveToLibrary(fileUri: string): Promise<void> {
  const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!granted) {
    throw new Error('Photo library permission is required to save the export.');
  }
  await MediaLibrary.saveToLibraryAsync(fileUri);
}
