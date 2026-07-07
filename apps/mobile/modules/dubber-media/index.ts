import { requireOptionalNativeModule } from 'expo-modules-core';

export interface VideoInfo {
  /** Duration in seconds. */
  duration: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees (0, 90, 180, 270). */
  rotation: number;
  frameRate: number;
  hasAudio: boolean;
}

interface DubberMediaNativeModule {
  getVideoInfo(uri: string): Promise<VideoInfo>;
  getAudioWaveform(uri: string, sampleCount: number): Promise<number[]>;
}

/**
 * Local Expo module (Kotlin on Android, Swift on iOS). `null` when running in
 * Expo Go or on web, where the native code is not compiled in — callers fall
 * back to JS approximations below.
 */
const native = requireOptionalNativeModule<DubberMediaNativeModule>('DubberMedia');

export const isNativeMediaAvailable = native != null;

/** Reads container metadata without decoding frames. */
export async function getVideoInfo(uri: string): Promise<VideoInfo | null> {
  if (!native) return null;
  try {
    return await native.getVideoInfo(uri);
  } catch {
    return null;
  }
}

/**
 * Decodes the audio track to PCM natively and returns `sampleCount` RMS
 * buckets normalized to 0..1, for drawing the timeline waveform.
 */
export async function getAudioWaveform(uri: string, sampleCount = 256): Promise<number[]> {
  if (native) {
    try {
      const wave = await native.getAudioWaveform(uri, sampleCount);
      if (wave.length > 0) return wave;
    } catch {
      // fall through to placeholder
    }
  }
  // Deterministic placeholder so the timeline still renders in Expo Go.
  return Array.from({ length: sampleCount }, (_, i) => {
    const t = i / sampleCount;
    return 0.25 + 0.2 * Math.abs(Math.sin(t * 43)) + 0.15 * Math.abs(Math.sin(t * 7));
  });
}
