export function formatTimecode(seconds: number, showMillis: boolean = false): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const base = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (!showMillis) return base;
  const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${base}.${String(ms).padStart(2, '0')}`;
}

/** Snap a time to the nearest interval (e.g. 0.5s grid) when snapping is enabled. */
export function snapTime(time: number, interval: number, enabled: boolean = true): number {
  if (!enabled || interval <= 0) return time;
  return Math.round(time / interval) * interval;
}
