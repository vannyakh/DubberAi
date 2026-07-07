import { clipDuration, EditorClip } from './types';

export const TIMELINE_CELL_WIDTH = 56;
export const TIMELINE_MIN_PX_PER_SEC = 12;
export const TIMELINE_MAX_PX_PER_SEC = 480;
export const TIMELINE_ADD_ENDING_WIDTH = 88;

export interface TimelineCell {
  key: string;
  clip: EditorClip;
  clipTime: number;
  x: number;
  width: number;
  isClipStart: boolean;
}

export interface TimelineClipSegment {
  key: string;
  clip: EditorClip;
  x: number;
  width: number;
}

export function clampPxPerSecond(px: number): number {
  return Math.max(TIMELINE_MIN_PX_PER_SEC, Math.min(TIMELINE_MAX_PX_PER_SEC, px));
}

export function buildTimelineCells(clips: EditorClip[], pxPerSecond: number): TimelineCell[] {
  const result: TimelineCell[] = [];
  const cellSeconds = TIMELINE_CELL_WIDTH / pxPerSecond;
  let x = 0;

  clips.forEach((clip) => {
    const duration = clipDuration(clip);
    const count = Math.max(1, Math.ceil(duration / cellSeconds));
    for (let i = 0; i < count; i++) {
      const start = i * cellSeconds;
      const remaining = duration - start;
      const width = Math.max(6, Math.min(TIMELINE_CELL_WIDTH, remaining * pxPerSecond));
      result.push({
        key: `${clip.id}:${i}`,
        clip,
        clipTime: start,
        x,
        width,
        isClipStart: i === 0,
      });
      x += width;
    }
  });

  return result;
}

export function visibleTimelineCells(
  cells: TimelineCell[],
  scrollX: number,
  viewportWidth: number,
  sidePad: number,
): TimelineCell[] {
  const viewStart = scrollX - sidePad - TIMELINE_CELL_WIDTH;
  const viewEnd = scrollX - sidePad + viewportWidth + TIMELINE_CELL_WIDTH;
  return cells.filter((cell) => cell.x + cell.width >= viewStart && cell.x <= viewEnd);
}

export function buildTimelineClipSegments(clips: EditorClip[], pxPerSecond: number): TimelineClipSegment[] {
  let x = 0;
  return clips.map((clip) => {
    const width = Math.max(6, clipDuration(clip) * pxPerSecond);
    const segment = { key: clip.id, clip, x, width };
    x += width;
    return segment;
  });
}

export function visibleTimelineClipSegments(
  segments: TimelineClipSegment[],
  scrollX: number,
  viewportWidth: number,
  sidePad: number,
): TimelineClipSegment[] {
  const pad = TIMELINE_CELL_WIDTH;
  const viewStart = scrollX - sidePad - pad;
  const viewEnd = scrollX - sidePad + viewportWidth + pad;
  return segments.filter((segment) => segment.x + segment.width >= viewStart && segment.x <= viewEnd);
}

export function filmstripTileCount(segmentWidth: number): number {
  return Math.max(1, Math.ceil(segmentWidth / TIMELINE_CELL_WIDTH));
}

export function downsampleWaveform(clip: EditorClip, barCount: number): number[] {
  if (clip.waveform.length === 0) return Array.from({ length: barCount }, () => 0.08);
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const idx = Math.min(
      clip.waveform.length - 1,
      Math.floor((i / barCount) * clip.waveform.length),
    );
    bars.push(clip.waveform[idx]);
  }
  return bars;
}

export function formatTimelineTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

export function rulerTickStep(pxPerSecond: number): number {
  if (pxPerSecond >= 120) return 1;
  if (pxPerSecond >= 60) return 2;
  if (pxPerSecond >= 30) return 5;
  return 10;
}
