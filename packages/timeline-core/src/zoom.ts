export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export function zoomInStep(zoom: number): number {
  return clampZoom(zoom * 1.5);
}

export function zoomOutStep(zoom: number): number {
  return clampZoom(zoom / 1.5);
}
