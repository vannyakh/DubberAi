/** Canvas snap math ported from apps/web/src/preview/preview-snap.ts */

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export const SNAP_THRESHOLD_PX = 8;
const ROTATION_SNAP_STEP = 90;
const ROTATION_SNAP_THRESHOLD = 5;

export interface SnapResult {
  snappedPosition: { x: number; y: number };
  activeLines: SnapLine[];
}

type AxisSnapCandidate = {
  snappedPosition: number;
  line: SnapLine;
  distance: number;
};

function getClosestAxisSnap(candidates: AxisSnapCandidate[], threshold: number): AxisSnapCandidate | null {
  'worklet';
  let best: AxisSnapCandidate | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (candidate.distance > threshold) continue;
    if (!best || candidate.distance < best.distance) {
      best = candidate;
    }
  }
  return best;
}

/** Snap element center/edges to canvas center and edges (center-origin coords). */
export function snapPosition({
  proposedPosition,
  canvasSize,
  elementSize,
  rotation = 0,
  snapThreshold,
}: {
  proposedPosition: { x: number; y: number };
  canvasSize: { width: number; height: number };
  elementSize: { width: number; height: number };
  rotation?: number;
  snapThreshold: { x: number; y: number };
}): SnapResult {
  'worklet';
  const left = -canvasSize.width / 2;
  const right = canvasSize.width / 2;
  const top = -canvasSize.height / 2;
  const bottom = canvasSize.height / 2;

  const rotRad = (rotation * Math.PI) / 180;
  const cosR = Math.abs(Math.cos(rotRad));
  const sinR = Math.abs(Math.sin(rotRad));
  const halfWidth = (elementSize.width * cosR + elementSize.height * sinR) / 2;
  const halfHeight = (elementSize.width * sinR + elementSize.height * cosR) / 2;

  const verticalTargets = [0, left, right];
  const horizontalTargets = [0, top, bottom];

  const xCandidates: AxisSnapCandidate[] = [];
  for (let i = 0; i < verticalTargets.length; i++) {
    const targetX = verticalTargets[i];
    xCandidates.push({
      snappedPosition: targetX,
      line: { type: 'vertical', position: targetX },
      distance: Math.abs(proposedPosition.x - targetX),
    });
    xCandidates.push({
      snappedPosition: targetX + halfWidth,
      line: { type: 'vertical', position: targetX },
      distance: Math.abs(proposedPosition.x - halfWidth - targetX),
    });
    xCandidates.push({
      snappedPosition: targetX - halfWidth,
      line: { type: 'vertical', position: targetX },
      distance: Math.abs(proposedPosition.x + halfWidth - targetX),
    });
  }

  const yCandidates: AxisSnapCandidate[] = [];
  for (let i = 0; i < horizontalTargets.length; i++) {
    const targetY = horizontalTargets[i];
    yCandidates.push({
      snappedPosition: targetY,
      line: { type: 'horizontal', position: targetY },
      distance: Math.abs(proposedPosition.y - targetY),
    });
    yCandidates.push({
      snappedPosition: targetY + halfHeight,
      line: { type: 'horizontal', position: targetY },
      distance: Math.abs(proposedPosition.y - halfHeight - targetY),
    });
    yCandidates.push({
      snappedPosition: targetY - halfHeight,
      line: { type: 'horizontal', position: targetY },
      distance: Math.abs(proposedPosition.y + halfHeight - targetY),
    });
  }

  const closestX = getClosestAxisSnap(xCandidates, snapThreshold.x);
  const closestY = getClosestAxisSnap(yCandidates, snapThreshold.y);

  const activeLines: SnapLine[] = [];
  if (closestX) activeLines.push(closestX.line);
  if (closestY) activeLines.push(closestY.line);

  return {
    snappedPosition: {
      x: closestX?.snappedPosition ?? proposedPosition.x,
      y: closestY?.snappedPosition ?? proposedPosition.y,
    },
    activeLines,
  };
}

export function snapRotation(proposedRotation: number): number {
  'worklet';
  const nearest =
    Math.round(proposedRotation / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
  if (Math.abs(proposedRotation - nearest) <= ROTATION_SNAP_THRESHOLD) {
    return nearest;
  }
  return proposedRotation;
}

/** Mobile normalized offset (-1..1) ↔ center-origin logical pixels. */
export function offsetToLogical(
  offsetX: number,
  offsetY: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number } {
  'worklet';
  return {
    x: offsetX * frameWidth * 0.5,
    y: offsetY * frameHeight * 0.5,
  };
}

export function logicalToOffset(
  x: number,
  y: number,
  frameWidth: number,
  frameHeight: number,
): { offsetX: number; offsetY: number } {
  'worklet';
  const halfW = Math.max(1, frameWidth * 0.5);
  const halfH = Math.max(1, frameHeight * 0.5);
  return { offsetX: x / halfW, offsetY: y / halfH };
}
