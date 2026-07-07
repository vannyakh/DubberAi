import { makeMutable } from 'react-native-reanimated';
import { clipDuration, EditorClip, mediaOverlayDuration, MediaOverlay } from './types';

export type TrimHandleEdge = 'in' | 'out';

export interface TrimBounds {
  trimStart: number;
  trimEnd: number;
  sourceDuration: number;
  /** When true, the out handle can extend past sourceDuration (still images). */
  allowExtendOut?: boolean;
}

export const TIMELINE_TRIM_SNAP_THRESHOLD_PX = 10;
export const MIN_TRIM_DURATION = 0.1;
/** ~7 days at 60px/s — practical unlimited trim-out for still images. */
export const TIMELINE_TRIM_MAX_EXTEND_SECONDS = 604_800;

/** Content-space X for the active trim snap guide (-1 = hidden). */
export const timelineTrimSnapLineX = makeMutable(-1);

export interface TrimSnapExclude {
  kind: 'clip' | 'overlay';
  id: string;
  edge: TrimHandleEdge | 'both';
}

export function buildTimelineTrimSnapTargets({
  playhead,
  clips,
  mediaOverlays,
  tickStep,
  exclude,
}: {
  playhead: number;
  clips: EditorClip[];
  mediaOverlays: MediaOverlay[];
  tickStep: number;
  exclude?: TrimSnapExclude;
}): number[] {
  const targets = new Set<number>();
  targets.add(0);
  targets.add(playhead);

  let cursor = 0;
  for (const clip of clips) {
    const start = cursor;
    const end = cursor + clipDuration(clip);
    const isClip = exclude?.kind === 'clip' && exclude.id === clip.id;
    if (!isClip || (exclude.edge !== 'in' && exclude.edge !== 'both')) targets.add(start);
    if (!isClip || (exclude.edge !== 'out' && exclude.edge !== 'both')) targets.add(end);
    cursor = end;
  }

  for (const overlay of mediaOverlays) {
    const start = overlay.startTime;
    const end = overlay.startTime + mediaOverlayDuration(overlay);
    const isOverlay = exclude?.kind === 'overlay' && exclude.id === overlay.id;
    if (!isOverlay || (exclude.edge !== 'in' && exclude.edge !== 'both')) targets.add(start);
    if (!isOverlay || (exclude.edge !== 'out' && exclude.edge !== 'both')) targets.add(end);
  }

  const maxTime = Math.max(cursor, playhead);
  for (let tick = 0; tick <= maxTime + tickStep; tick += tickStep) {
    targets.add(tick);
  }

  return [...targets];
}

function clampTrimTranslationWorklet(
  edge: TrimHandleEdge,
  translationX: number,
  pxPerSec: number,
  bounds: TrimBounds,
): number {
  'worklet';
  const px = Math.max(1, pxPerSec);
  const { trimStart, trimEnd, sourceDuration, allowExtendOut } = bounds;
  const shrinkRoom = (trimEnd - trimStart - MIN_TRIM_DURATION) * px;

  if (edge === 'in') {
    const maxRight = shrinkRoom;
    const maxLeft = -trimStart * px;
    return Math.max(maxLeft, Math.min(maxRight, translationX));
  }

  const maxExtendSec = allowExtendOut
    ? TIMELINE_TRIM_MAX_EXTEND_SECONDS
    : Math.max(0, sourceDuration - trimEnd);
  const maxRight = maxExtendSec * px;
  const maxLeft = -shrinkRoom;
  return Math.max(maxLeft, Math.min(maxRight, translationX));
}

export function resolveTrimTranslation(
  edge: TrimHandleEdge,
  translationX: number,
  pxPerSec: number,
  bounds: TrimBounds,
  edgeTimeSeconds: number,
  snapTargets: number[],
): { translationX: number; snapLineX: number; snapTime: number } {
  'worklet';
  const px = Math.max(1, pxPerSec);
  const thresholdSec = TIMELINE_TRIM_SNAP_THRESHOLD_PX / px;
  const proposedEdge = edgeTimeSeconds + translationX / px;

  let snapTime = -1;
  let bestDist = thresholdSec;
  for (let i = 0; i < snapTargets.length; i++) {
    const target = snapTargets[i];
    const dist = Math.abs(target - proposedEdge);
    if (dist < bestDist) {
      bestDist = dist;
      snapTime = target;
    }
  }

  let resolvedX = translationX;
  if (snapTime >= 0) {
    resolvedX = (snapTime - edgeTimeSeconds) * px;
  }

  const clamped = clampTrimTranslationWorklet(edge, resolvedX, px, bounds);
  const finalEdge = edgeTimeSeconds + clamped / px;

  let snapLineX = -1;
  if (snapTime >= 0 && Math.abs(finalEdge - snapTime) <= thresholdSec * 0.35) {
    snapLineX = snapTime * px;
  }

  return { translationX: clamped, snapLineX, snapTime: snapLineX >= 0 ? snapTime : -1 };
}

export function buildTimelineMoveSnapTargets({
  playhead,
  clips,
  mediaOverlays,
  tickStep,
  excludeOverlayId,
}: {
  playhead: number;
  clips: EditorClip[];
  mediaOverlays: MediaOverlay[];
  tickStep: number;
  excludeOverlayId?: string;
}): number[] {
  return buildTimelineTrimSnapTargets({
    playhead,
    clips,
    mediaOverlays,
    tickStep,
    exclude: excludeOverlayId
      ? { kind: 'overlay', id: excludeOverlayId, edge: 'both' }
      : undefined,
  });
}

export function resolveMoveTranslation(
  translationX: number,
  pxPerSec: number,
  startTimeSeconds: number,
  snapTargets: number[],
): { translationX: number; snapLineX: number; snapTime: number } {
  'worklet';
  const px = Math.max(1, pxPerSec);
  const thresholdSec = TIMELINE_TRIM_SNAP_THRESHOLD_PX / px;
  const proposedStart = startTimeSeconds + translationX / px;

  let snapTime = -1;
  let bestDist = thresholdSec;
  for (let i = 0; i < snapTargets.length; i++) {
    const target = snapTargets[i];
    const dist = Math.abs(target - proposedStart);
    if (dist < bestDist) {
      bestDist = dist;
      snapTime = target;
    }
  }

  let resolvedX = translationX;
  if (snapTime >= 0) {
    resolvedX = (snapTime - startTimeSeconds) * px;
  }

  const minX = -startTimeSeconds * px;
  const clamped = Math.max(minX, resolvedX);
  const finalStart = startTimeSeconds + clamped / px;

  let snapLineX = -1;
  if (snapTime >= 0 && Math.abs(finalStart - snapTime) <= thresholdSec * 0.35) {
    snapLineX = snapTime * px;
  }

  return { translationX: clamped, snapLineX, snapTime: snapLineX >= 0 ? snapTime : -1 };
}
