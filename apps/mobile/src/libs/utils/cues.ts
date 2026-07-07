import { segmentsToCues } from '@dubbercute/captions';
import { parseSegments } from '@dubbercute/utils';

/** Parse a timestamped transcript/translation into caption cues. */
export function buildCues(source: string) {
  return source ? segmentsToCues(parseSegments(source)) : [];
}
