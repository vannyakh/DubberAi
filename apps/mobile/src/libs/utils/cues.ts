import { segmentsToCues } from '@video-voice-translator/captions';
import { parseSegments } from '@video-voice-translator/utils';

/** Parse a timestamped transcript/translation into caption cues. */
export function buildCues(source: string) {
  return source ? segmentsToCues(parseSegments(source)) : [];
}
