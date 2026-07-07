import { CaptionCue, CaptionFormat, Segment } from '@dubbercute/types';

const DEFAULT_CUE_DURATION = 4;

/**
 * Convert parsed transcript segments (with a start time each) into caption cues.
 * Each cue ends when the next one starts, capped at `maxCueDuration`.
 */
export function segmentsToCues(
  segments: Segment[],
  options: { maxCueDuration?: number; totalDuration?: number } = {}
): CaptionCue[] {
  const maxCueDuration = options.maxCueDuration ?? DEFAULT_CUE_DURATION;
  return segments.map((segment, i) => {
    const next = segments[i + 1];
    const naturalEnd = next ? next.time : options.totalDuration ?? segment.time + maxCueDuration;
    const end = Math.min(naturalEnd, segment.time + maxCueDuration * 4);
    return {
      index: i + 1,
      start: segment.time,
      end: Math.max(end, segment.time + 0.5),
      speaker: segment.speaker || undefined,
      text: segment.text,
    };
  });
}

function pad(n: number, width: number = 2): string {
  return String(Math.floor(n)).padStart(width, '0');
}

/** HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT) */
function formatTimestamp(seconds: number, msSeparator: ',' | '.'): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${msSeparator}${String(ms).padStart(3, '0')}`;
}

/** H:MM:SS.cc (ASS uses centiseconds) */
function formatAssTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds - Math.floor(seconds)) * 100);
  return `${h}:${pad(m)}:${pad(s)}.${String(cs).padStart(2, '0')}`;
}

function cueText(cue: CaptionCue, includeSpeaker: boolean): string {
  return includeSpeaker && cue.speaker ? `${cue.speaker}: ${cue.text}` : cue.text;
}

export function toSRT(cues: CaptionCue[], options: { includeSpeaker?: boolean } = {}): string {
  const includeSpeaker = options.includeSpeaker ?? true;
  return cues
    .map(
      (cue, i) =>
        `${i + 1}\n${formatTimestamp(cue.start, ',')} --> ${formatTimestamp(cue.end, ',')}\n${cueText(cue, includeSpeaker)}`
    )
    .join('\n\n')
    .concat('\n');
}

export function toVTT(cues: CaptionCue[], options: { includeSpeaker?: boolean } = {}): string {
  const includeSpeaker = options.includeSpeaker ?? true;
  const body = cues
    .map(
      (cue) =>
        `${formatTimestamp(cue.start, '.')} --> ${formatTimestamp(cue.end, '.')}\n${cueText(cue, includeSpeaker)}`
    )
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}

const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,60,60,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export function toASS(cues: CaptionCue[], options: { includeSpeaker?: boolean } = {}): string {
  const includeSpeaker = options.includeSpeaker ?? false;
  const events = cues
    .map((cue) => {
      const text = cueText(cue, includeSpeaker).replace(/\n/g, '\\N');
      return `Dialogue: 0,${formatAssTimestamp(cue.start)},${formatAssTimestamp(cue.end)},Default,${cue.speaker || ''},0,0,0,,${text}`;
    })
    .join('\n');
  return `${ASS_HEADER}\n${events}\n`;
}

export function exportCaptions(
  cues: CaptionCue[],
  format: CaptionFormat,
  options: { includeSpeaker?: boolean } = {}
): string {
  switch (format) {
    case 'srt':
      return toSRT(cues, options);
    case 'vtt':
      return toVTT(cues, options);
    case 'ass':
      return toASS(cues, options);
  }
}
