import { CaptionCue } from '@video-voice-translator/types';

export function findActiveCueIndex(cues: CaptionCue[], currentTime: number): number {
  return cues.findIndex((cue) => currentTime >= cue.start && currentTime < cue.end);
}

export function findActiveCue(cues: CaptionCue[], currentTime: number): CaptionCue | undefined {
  const index = findActiveCueIndex(cues, currentTime);
  return index === -1 ? undefined : cues[index];
}
