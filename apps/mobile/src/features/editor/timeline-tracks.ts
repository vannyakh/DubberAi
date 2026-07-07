import {
  STUDIO_AUDIO_LANE_HEIGHT,
  STUDIO_LANE_GAP,
  STUDIO_MEDIA_OVERLAY_LANE_HEIGHT,
  STUDIO_TEXT_LANE_HEIGHT,
  STUDIO_VIDEO_LANE_HEIGHT,
} from './studio-layout';
import { MediaOverlay } from './types';

export type TimelineTrackKind = 'video' | 'audio' | 'text' | 'media';

export interface TimelineTrackRow {
  id: string;
  kind: TimelineTrackKind;
  height: number;
  index: number;
}

const OVERLAYS_PER_TEXT_TRACK = 3;

/** Core timeline lanes — extra text rows appear as overlays grow. */
export function computeTimelineTracks(textOverlayCount: number): TimelineTrackRow[] {
  const rows: TimelineTrackRow[] = [
    { id: 'video-0', kind: 'video', height: STUDIO_VIDEO_LANE_HEIGHT, index: 0 },
    {
      id: 'media-0',
      kind: 'media',
      height: STUDIO_MEDIA_OVERLAY_LANE_HEIGHT,
      index: 0,
    },
    { id: 'audio-0', kind: 'audio', height: STUDIO_AUDIO_LANE_HEIGHT, index: 0 },
  ];

  const textRows = Math.max(1, Math.ceil(Math.max(textOverlayCount, 1) / OVERLAYS_PER_TEXT_TRACK));
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

export function mediaOverlaysForTrack(overlays: MediaOverlay[], trackIndex: number): MediaOverlay[] {
  return overlays.filter((overlay) => overlay.trackIndex === trackIndex);
}
