export const DEFAULT_CLIP_CONTENT_TRANSFORM = {
  contentScale: 1,
  contentOffsetX: 0,
  contentOffsetY: 0,
  contentRotation: 0,
} as const;

export interface EditorClip {
  id: string;
  /** Local file/content uri of the source asset. */
  uri: string;
  /** Photo-library asset id — resolves ph:// URIs when uri alone is not playable. */
  libraryAssetId?: string;
  /** Video or still image used as a timed clip on the timeline. */
  mediaType: 'video' | 'image';
  /** Total duration of the source asset in seconds. */
  sourceDuration: number;
  /** Trim-in point inside the source, seconds. */
  trimStart: number;
  /** Trim-out point inside the source, seconds. */
  trimEnd: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Normalized 0..1 audio RMS buckets for the waveform lane. */
  waveform: number[];
  filterId: FilterId;
  muted: boolean;
  /** Zoom relative to canvas fit (1 = contain). */
  contentScale: number;
  /** Normalized pan from center (-1..1). */
  contentOffsetX: number;
  contentOffsetY: number;
  /** Degrees clockwise. */
  contentRotation: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  /** Normalized position, 0..1 of preview size. */
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export type FilterId = 'none' | 'warm' | 'cool' | 'mono' | 'fade' | 'vivid';

export interface FilterPreset {
  id: FilterId;
  label: string;
  /** Preview tint drawn by Skia over the video (rgba). */
  tint: string;
  /** Vignette strength 0..1 for the Skia preview overlay. */
  vignette: number;
  /** ffmpeg -vf expression applied at export for the exact grade. */
  ffmpegFilter: string | null;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'Original', tint: 'transparent', vignette: 0, ffmpegFilter: null },
  {
    id: 'warm',
    label: 'Warm',
    tint: 'rgba(255,140,50,0.10)',
    vignette: 0.25,
    ffmpegFilter: 'eq=saturation=1.15:gamma_r=1.06:gamma_b=0.94',
  },
  {
    id: 'cool',
    label: 'Cool',
    tint: 'rgba(60,140,255,0.10)',
    vignette: 0.2,
    ffmpegFilter: 'eq=saturation=1.05:gamma_b=1.08:gamma_r=0.95',
  },
  {
    id: 'mono',
    label: 'Mono',
    tint: 'rgba(0,0,0,0.05)',
    vignette: 0.35,
    ffmpegFilter: 'hue=s=0:b=0.02',
  },
  {
    id: 'fade',
    label: 'Fade',
    tint: 'rgba(230,225,215,0.12)',
    vignette: 0.1,
    ffmpegFilter: 'eq=contrast=0.88:brightness=0.04:saturation=0.85',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    tint: 'rgba(255,0,128,0.05)',
    vignette: 0.15,
    ffmpegFilter: 'eq=saturation=1.35:contrast=1.08',
  },
];

export type ExportPhase = 'idle' | 'preparing' | 'encoding' | 'saving' | 'done' | 'error';

export interface ExportState {
  phase: ExportPhase;
  /** 0..1 across the whole pipeline. */
  progress: number;
  error: string | null;
  /** Library asset uri once saved. */
  outputUri: string | null;
}

export const clipDuration = (clip: EditorClip) => Math.max(0, clip.trimEnd - clip.trimStart);

export const timelineDuration = (clips: EditorClip[]) =>
  clips.reduce((sum, clip) => sum + clipDuration(clip), 0);

export function clipTimelineStart(clips: EditorClip[], clipId: string): number {
  let cursor = 0;
  for (const clip of clips) {
    if (clip.id === clipId) return cursor;
    cursor += clipDuration(clip);
  }
  return 0;
}

/** Maps a global timeline time to the clip that contains it. */
export function clipAtTime(
  clips: EditorClip[],
  time: number,
): { clip: EditorClip; localTime: number; index: number } | null {
  let cursor = 0;
  for (let i = 0; i < clips.length; i++) {
    const d = clipDuration(clips[i]);
    if (time < cursor + d || i === clips.length - 1) {
      return { clip: clips[i], localTime: Math.min(d, Math.max(0, time - cursor)), index: i };
    }
    cursor += d;
  }
  return null;
}
