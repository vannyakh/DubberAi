import {
  STUDIO_AUDIO_LANE_HEIGHT,
  STUDIO_LANE_GAP,
  STUDIO_TEXT_LANE_HEIGHT,
  STUDIO_VIDEO_LANE_HEIGHT,
} from './studio-layout';

export type TimelineTrackKind = 'video' | 'audio' | 'text';

export interface TimelineTrackRow {
  id: string;
  kind: TimelineTrackKind;
  height: number;
  index: number;
}

const OVERLAYS_PER_TEXT_TRACK = 3;

/** Builds timeline rows; extra audio/text lanes appear as projects grow. */
export function computeTimelineTracks(clipCount: number, overlayCount: number): TimelineTrackRow[] {
  const rows: TimelineTrackRow[] = [
    { id: 'video-0', kind: 'video', height: STUDIO_VIDEO_LANE_HEIGHT, index: 0 },
  ];

  const audioRows = clipCount > 2 ? 2 : 1;
  for (let i = 0; i < audioRows; i++) {
    rows.push({ id: `audio-${i}`, kind: 'audio', height: STUDIO_AUDIO_LANE_HEIGHT, index: i });
  }

  const textRows = Math.max(1, Math.ceil(Math.max(overlayCount, 1) / OVERLAYS_PER_TEXT_TRACK));
  for (let i = 0; i < textRows; i++) {
    rows.push({ id: `text-${i}`, kind: 'text', height: STUDIO_TEXT_LANE_HEIGHT, index: i });
  }

  return rows;
}

export function timelineTracksContentHeight(rows: TimelineTrackRow[]): number {
  if (rows.length === 0) return 0;
  const lanes = rows.reduce((sum, row) => sum + row.height, 0);
  return lanes + STUDIO_LANE_GAP * Math.max(0, rows.length - 1);
}

export function overlaysForTextTrack<T extends { id: string }>(
  overlays: T[],
  trackIndex: number,
): T[] {
  const start = trackIndex * OVERLAYS_PER_TEXT_TRACK;
  return overlays.slice(start, start + OVERLAYS_PER_TEXT_TRACK);
}
