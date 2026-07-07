import { useMemo } from 'react';
import { buildCues } from '@/libs/utils';

/** Memoized caption cues, preferring the translation over the raw transcript. */
export function useCues(transcript: string, translated: string) {
  return useMemo(() => buildCues(translated || transcript), [transcript, translated]);
}
