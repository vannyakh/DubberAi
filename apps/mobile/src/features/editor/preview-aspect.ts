import { EditorClip } from './types';

/** Default vertical canvas (9:16) when no clip dimensions are available. */
export const PREVIEW_ASPECT_FALLBACK = 9 / 16;

const MIN_ASPECT = 0.35;
const MAX_ASPECT = 2.4;

export function clampPreviewAspect(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return PREVIEW_ASPECT_FALLBACK;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, ratio));
}

/** Project preview aspect from the first clip with known dimensions. */
export function projectPreviewAspectRatio(clips: EditorClip[]): number {
  const withSize = clips.find((clip) => clip.width > 0 && clip.height > 0);
  if (!withSize) return PREVIEW_ASPECT_FALLBACK;
  return clampPreviewAspect(withSize.width / withSize.height);
}

/** Fit a width/height box with `aspect` (w/h) inside the available area. */
export function fitSizeToAspect(
  availableWidth: number,
  availableHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (availableWidth <= 0 || availableHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const safeAspect = clampPreviewAspect(aspect);
  const containerAspect = availableWidth / availableHeight;

  if (containerAspect > safeAspect) {
    const height = availableHeight;
    return { width: height * safeAspect, height };
  }

  const width = availableWidth;
  return { width, height: width / safeAspect };
}
