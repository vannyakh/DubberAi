import { useCallback, useState } from 'react';
import { zoomInStep, zoomOutStep } from '@dubbercut/timeline-core';

export function useTimelineZoom(initial: number = 1) {
  const [zoom, setZoom] = useState(initial);

  const zoomIn = useCallback(() => setZoom(zoomInStep), []);
  const zoomOut = useCallback(() => setZoom(zoomOutStep), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, setZoom, zoomIn, zoomOut, resetZoom };
}
