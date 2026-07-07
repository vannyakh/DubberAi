import { Clip, Track } from '@dubbercute/types';

/** Move a clip to a new timeline position (immutably). */
export function moveClip(track: Track, clipId: string, newStart: number): Track {
  return {
    ...track,
    clips: track.clips.map((clip) =>
      clip.id === clipId ? { ...clip, start: Math.max(0, newStart) } : clip
    ),
  };
}

/** Split a clip in two at an absolute timeline position. */
export function splitClip(track: Track, clipId: string, atTime: number): Track {
  const clip = track.clips.find((c) => c.id === clipId);
  if (!clip || atTime <= clip.start || atTime >= clip.start + clip.duration) return track;

  const offsetIntoClip = atTime - clip.start;
  const first: Clip = { ...clip, duration: offsetIntoClip };
  const second: Clip = {
    ...clip,
    id: `${clip.id}-b`,
    start: atTime,
    duration: clip.duration - offsetIntoClip,
    sourceOffset: clip.sourceOffset + offsetIntoClip,
  };
  return {
    ...track,
    clips: track.clips.flatMap((c) => (c.id === clipId ? [first, second] : [c])),
  };
}

export function removeClip(track: Track, clipId: string): Track {
  return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
}
