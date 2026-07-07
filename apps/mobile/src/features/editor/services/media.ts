import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { getAudioWaveform, getVideoInfo } from '../../../../modules/dubber-media';
import { EditorClip } from '../types';

/**
 * Opens the system video picker and normalizes the result into an EditorClip,
 * enriching it with metadata + waveform from the local native module.
 */
export async function importVideoClip(): Promise<EditorClip | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const [info, waveform] = await Promise.all([
    getVideoInfo(asset.uri),
    getAudioWaveform(asset.uri, 512),
  ]);

  const duration = info?.duration ?? (asset.duration ? asset.duration / 1000 : 0);

  return {
    id: `clip-${Date.now().toString(36)}`,
    uri: asset.uri,
    sourceDuration: duration,
    trimStart: 0,
    trimEnd: duration,
    width: info?.width ?? asset.width ?? 0,
    height: info?.height ?? asset.height ?? 0,
    hasAudio: info?.hasAudio ?? true,
    waveform,
  };
}

/** Saves the exported file into the user's photo library. */
export async function saveToLibrary(fileUri: string): Promise<void> {
  const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!granted) {
    throw new Error('Photo library permission is required to save the export.');
  }
  await MediaLibrary.saveToLibraryAsync(fileUri);
}
