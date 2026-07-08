/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Segment } from '@dubbercut/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  DEFAULT_TARGET_LANGUAGE,
  DEFAULT_UI_LOCALE,
  LANGUAGE_GOOGLE_FONTS,
  FALLBACK_LATIN_FONT,
  containsKhmerScript,
  containsThaiScript,
  containsCjkScript,
  containsHangulScript,
  containsDevanagariScript,
  containsVietnameseDiacritics,
  resolveGoogleFontForLanguage,
  resolveGoogleFontForText,
  getPriorityGoogleFonts,
  isKhmerTargetLanguage,
} from './language-fonts';

const PAUSE_MARKER_RE = /\(\.\.\.\s*(\d+(?:\.\d+)?)\s*s\)/gi;

export interface SegmentTextPart {
  type: 'text' | 'pause';
  value: string;
  seconds?: number;
}

/** Split dialogue into spoken text + styled `(...Ns)` pause chips for the UI. */
export function tokenizeSegmentText(text: string): SegmentTextPart[] {
  const parts: SegmentTextPart[] = [];
  const source = text || '';
  let lastIndex = 0;
  const re = new RegExp(PAUSE_MARKER_RE.source, 'gi');
  for (const match of source.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: source.slice(lastIndex, index) });
    }
    const seconds = Number.parseFloat(match[1] || '0');
    parts.push({
      type: 'pause',
      value: match[0],
      seconds: Number.isFinite(seconds) ? seconds : 0,
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < source.length) {
    parts.push({ type: 'text', value: source.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: source }];
}

function extractPauseMarkers(text: string): {
  cleanText: string;
  pauseBeforeSeconds?: number;
  pauseAfterSeconds?: number;
  inlinePauses?: number[];
} {
  const matches = [...text.matchAll(new RegExp(PAUSE_MARKER_RE.source, 'gi'))];
  if (matches.length === 0) {
    return { cleanText: text.trim() };
  }

  const startsWithPause = matches[0]?.index === 0;
  const last = matches[matches.length - 1];
  const endsWithPause =
    last != null &&
    (last.index ?? 0) + last[0].length === text.trimEnd().length;

  let pauseBeforeSeconds: number | undefined;
  let pauseAfterSeconds: number | undefined;
  const inlinePauses: number[] = [];

  matches.forEach((match, index) => {
    const seconds = Number.parseFloat(match[1] || '0');
    if (!Number.isFinite(seconds)) return;
    if (index === 0 && startsWithPause) {
      pauseBeforeSeconds = seconds;
      return;
    }
    if (index === matches.length - 1 && endsWithPause) {
      pauseAfterSeconds = seconds;
      return;
    }
    inlinePauses.push(seconds);
  });

  const cleanText = text
    .replace(new RegExp(PAUSE_MARKER_RE.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanText,
    pauseBeforeSeconds,
    pauseAfterSeconds,
    inlinePauses: inlinePauses.length > 0 ? inlinePauses : undefined,
  };
}

export function parseSegments(text: string): Segment[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const segments = lines.map((line) => {
    const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
    if (match) {
      const body = match[4] || '';
      const pauses = extractPauseMarkers(body);
      return {
        time: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
        speaker: match[3].trim(),
        text: pauses.cleanText,
        raw: line,
        pauseBeforeSeconds: pauses.pauseBeforeSeconds,
        pauseAfterSeconds: pauses.pauseAfterSeconds,
        inlinePauses: pauses.inlinePauses,
      } satisfies Segment;
    }

    const pauses = extractPauseMarkers(line);
    return {
      time: 0,
      speaker: '',
      text: pauses.cleanText || line,
      raw: line,
      pauseBeforeSeconds: pauses.pauseBeforeSeconds,
      pauseAfterSeconds: pauses.pauseAfterSeconds,
      inlinePauses: pauses.inlinePauses,
    } satisfies Segment;
  });

  return annotateSegmentEnds(segments);
}

/** Fill `end` from the next segment start so UI/trim can show windows. */
export function annotateSegmentEnds(segments: Segment[]): Segment[] {
  return segments.map((segment, index) => {
    const next = segments[index + 1];
    if (next && next.time > segment.time) {
      return { ...segment, end: next.time };
    }
    if (segment.end != null) return segment;
    const spokenEstimate = Math.max(1.2, Math.min(12, segment.text.length / 12));
    const pausePad =
      (segment.pauseBeforeSeconds ?? 0) +
      (segment.pauseAfterSeconds ?? 0) +
      (segment.inlinePauses?.reduce((sum, value) => sum + value, 0) ?? 0);
    return {
      ...segment,
      end: segment.time + spokenEstimate + pausePad,
    };
  });
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(parts[0], 10);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

export const LANGUAGES = [
  { code: 'Khmer', name: 'Khmer (ភាសាខ្មែរ)' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'French', name: 'French' },
  { code: 'German', name: 'German' },
  { code: 'Chinese', name: 'Chinese' },
  { code: 'Japanese', name: 'Japanese' },
  { code: 'Korean', name: 'Korean' },
  { code: 'Vietnamese', name: 'Vietnamese' },
  { code: 'Thai', name: 'Thai' },
  { code: 'Hindi', name: 'Hindi' },
];

export const VOICES = [
  { id: 'Kore', label: 'Female (Kore)', gender: 'female' as const },
  { id: 'Zephyr', label: 'Female (Zephyr)', gender: 'female' as const },
  { id: 'Puck', label: 'Male (Puck)', gender: 'male' as const },
  { id: 'Charon', label: 'Male (Charon)', gender: 'male' as const },
  { id: 'Fenrir', label: 'Male (Fenrir)', gender: 'male' as const },
];

export function voicesForGender(gender: 'female' | 'male' | 'neutral') {
  if (gender === 'female') return VOICES.filter((voice) => voice.gender === 'female');
  if (gender === 'male') return VOICES.filter((voice) => voice.gender === 'male');
  return VOICES;
}