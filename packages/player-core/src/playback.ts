export function clampSeek(time: number, duration: number): number {
  return Math.max(0, Math.min(time, duration));
}

export const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

export function nextPlaybackRate(current: number): number {
  const index = PLAYBACK_RATES.indexOf(current as (typeof PLAYBACK_RATES)[number]);
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
}
