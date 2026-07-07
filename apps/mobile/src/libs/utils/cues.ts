import { segmentsToCues } from '@dubbercut/captions';
import { parseSegments } from '@dubbercut/utils';

/** Parse a timestamped transcript/translation into caption cues. */
export function buildCues(source: string) {
  return source ? segmentsToCues(parseSegments(source)) : [];
}
