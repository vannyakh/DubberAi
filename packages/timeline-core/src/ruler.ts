const TICK_INTERVALS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];

/** Pick a tick interval that keeps ruler labels at least `minLabelPx` apart. */
export function computeTickInterval(pixelsPerSecond: number, minLabelPx: number = 60): number {
  return TICK_INTERVALS.find((i) => i * pixelsPerSecond >= minLabelPx) ?? 300;
}

export function computeTicks(duration: number, pixelsPerSecond: number, minLabelPx: number = 60): number[] {
  const interval = computeTickInterval(pixelsPerSecond, minLabelPx);
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += interval) ticks.push(t);
  return ticks;
}
