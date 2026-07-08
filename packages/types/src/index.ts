/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VocalGender = 'female' | 'male' | 'neutral';

export type VocalFeeling =
  | 'neutral'
  | 'warm'
  | 'calm'
  | 'excited'
  | 'angry'
  | 'sad'
  | 'serious'
  | 'playful'
  | 'fearful'
  | 'romantic'
  | 'urgent';

export type VocalIntensity = 'low' | 'medium' | 'high';

/** Per-speaker gender + default acting style for voice casting. */
export interface SpeakerVocalProfile {
  speaker: string;
  gender: VocalGender;
  defaultFeeling: VocalFeeling;
  /** Short persona cue, e.g. "gentle narrator", "sharp antagonist". */
  persona?: string;
}

/** Per-line emotional delivery used to tune TTS. */
export interface SegmentVocalStyle {
  feeling: VocalFeeling;
  intensity: VocalIntensity;
  /** Short delivery cue, e.g. "soft smile", "shaky whisper". */
  delivery?: string;
}

export interface Segment {
  time: number;
  speaker: string;
  /** Spoken text with pause markers stripped (safe for TTS / captions). */
  text: string;
  raw: string;
  /** Leading silence marker `(...Ns)` before dialogue. */
  pauseBeforeSeconds?: number;
  /** Trailing silence marker `(...Ns)` after dialogue. */
  pauseAfterSeconds?: number;
  /** Inline silence markers embedded inside the dialogue. */
  inlinePauses?: number[];
  /** Optional end time when known from the next segment beat. */
  end?: number;
  /** Auto-detected emotional feeling for this line. */
  feeling?: VocalFeeling;
  /** Auto-detected intensity for TTS delivery. */
  intensity?: VocalIntensity;
  /** Short emotional delivery cue for TTS prompting. */
  delivery?: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Voice {
  id: string;
  label: string;
}

export interface HighlightClip {
  start: string;
  end: string;
  narration: string;
}

export interface VideoAnalysis {
  summary: string;
  highlights: HighlightClip[];
}

export type AppStatus = 'idle' | 'transcribing' | 'translating' | 'speaking' | 'analyzing' | 'error';
export type ActiveTab = 'translate' | 'transcript' | 'analysis' | 'media' | 'text' | 'audio' | 'stickers' | 'effects' | 'transitions' | 'dub' | 'history';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface CaptionCue {
  index: number;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  speaker?: string;
  text: string;
}

export type CaptionFormat = 'srt' | 'vtt' | 'ass';

export type TrackKind = 'video' | 'audio' | 'caption' | 'overlay';

export interface Clip {
  id: string;
  trackId: string;
  /** Timeline position in seconds */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** Offset into the source media in seconds */
  sourceOffset: number;
  label?: string;
}

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted?: boolean;
  locked?: boolean;
  clips: Clip[];
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  projectId: string;
  kind: 'render' | 'export' | 'ai';
  status: JobStatus;
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  /** Composition frame ratio, e.g. "16:9" | "9:16" | "1:1" */
  aspectRatio?: string;
  /** Cover thumbnail uri (first clip) — local file or resolved library uri. */
  videoUrl?: string;
  /** Photo-library asset id to re-resolve cover when videoUrl is stale. */
  coverAssetId?: string;
  coverMediaType?: 'video' | 'image';
  transcript?: string;
  translatedText?: string;
  targetLang?: string;
  selectedVoice?: string;
  speakerVoices?: Record<string, string>;
  detectedSpeakers?: string[];
  audioBase64?: string | null;
  videoAnalysis?: VideoAnalysis | null;
  createdAt: string;
  driveFileId?: string;
  driveFileUrl?: string;
  driveAudioId?: string;
  driveAudioUrl?: string;
}

