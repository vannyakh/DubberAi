import { useCallback, useState } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export function useTimelineZoom(initial: number = 1) {
  const [zoom, setZoom] = useState(initial);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.5, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.5, MIN_ZOOM)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, setZoom, zoomIn, zoomOut, resetZoom };
}
