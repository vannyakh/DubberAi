import { chatJson } from './chat';
import type {
  Segment,
  SegmentVocalStyle,
  SpeakerVocalProfile,
  VocalFeeling,
  VocalGender,
  VocalIntensity,
} from '@dubbercut/types';

const GENDERS: VocalGender[] = ['female', 'male', 'neutral'];
const FEELINGS: VocalFeeling[] = [
  'neutral',
  'warm',
  'calm',
  'excited',
  'angry',
  'sad',
  'serious',
  'playful',
  'fearful',
  'romantic',
  'urgent',
];
const INTENSITIES: VocalIntensity[] = ['low', 'medium', 'high'];

const FEMALE_VOICES = ['Kore', 'Zephyr'] as const;
const MALE_VOICES = ['Puck', 'Charon', 'Fenrir'] as const;

function isGender(value: unknown): value is VocalGender {
  return typeof value === 'string' && GENDERS.includes(value as VocalGender);
}

function isFeeling(value: unknown): value is VocalFeeling {
  return typeof value === 'string' && FEELINGS.includes(value as VocalFeeling);
}

function isIntensity(value: unknown): value is VocalIntensity {
  return typeof value === 'string' && INTENSITIES.includes(value as VocalIntensity);
}

function clampDelivery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, 80);
  return cleaned || undefined;
}

export function voiceForGender(
  gender: VocalGender,
  preferredIndex = 0,
  defaultVoice = 'Kore',
): string {
  if (gender === 'female') {
    return FEMALE_VOICES[preferredIndex % FEMALE_VOICES.length] ?? 'Kore';
  }
  if (gender === 'male') {
    return MALE_VOICES[preferredIndex % MALE_VOICES.length] ?? 'Puck';
  }
  return defaultVoice;
}

export function feelingInstruction({
  feeling,
  intensity,
  delivery,
  persona,
}: {
  feeling?: VocalFeeling;
  intensity?: VocalIntensity;
  delivery?: string;
  persona?: string;
}): string {
  const mood = feeling && feeling !== 'neutral' ? feeling : 'natural';
  const energy = intensity ?? 'medium';
  const parts = [
    `Speak with a ${mood} emotional tone`,
    `at ${energy} intensity`,
  ];
  if (persona) parts.push(`as ${persona}`);
  if (delivery) parts.push(`using ${delivery}`);
  parts.push('Keep it realistic and conversational. Do not narrate stage directions.');
  return parts.join(', ') + '.';
}

/** Wrap spoken dialogue with a soft acting directive for Gemini TTS. */
export function styleTtsPrompt({
  text,
  feeling,
  intensity,
  delivery,
  persona,
}: {
  text: string;
  feeling?: VocalFeeling;
  intensity?: VocalIntensity;
  delivery?: string;
  persona?: string;
}): string {
  const spoken = text.trim();
  if (!spoken) return spoken;
  if (!feeling && !delivery && !persona) return spoken;

  const instruction = feelingInstruction({
    feeling,
    intensity,
    delivery,
    persona,
  });
  return `${instruction}\n\nDialogue:\n${spoken}`;
}

export interface DetectVocalStylesResult {
  speakers: SpeakerVocalProfile[];
  /** Map from `"index"` string to segment style. */
  segmentStyles: Record<number, SegmentVocalStyle>;
}

/**
 * Infer speaker gender + per-line emotional delivery from a transcript.
 * Used to cast voices and tune TTS emotional realism.
 */
export async function detectVocalStyles({
  transcript,
  segments,
}: {
  transcript: string;
  segments: Segment[];
}): Promise<DetectVocalStylesResult> {
  const sample = segments.slice(0, 60).map((segment, index) => ({
    index,
    time: segment.time,
    speaker: segment.speaker || 'Speaker',
    text: segment.text.slice(0, 240),
  }));

  const speakers = [
    ...new Set(segments.map((segment) => segment.speaker || 'Speaker')),
  ];

  try {
    const result = await chatJson<{
      speakers?: Array<{
        speaker?: string;
        gender?: string;
        defaultFeeling?: string;
        persona?: string;
      }>;
      segments?: Array<{
        index?: number;
        feeling?: string;
        intensity?: string;
        delivery?: string;
      }>;
    }>(
      `Analyze this video transcript for dubbing voice casting and emotional delivery.

Return JSON:
{
  "speakers": [
    {
      "speaker": "exact speaker name",
      "gender": "female|male|neutral",
      "defaultFeeling": "neutral|warm|calm|excited|angry|sad|serious|playful|fearful|romantic|urgent",
      "persona": "short character description"
    }
  ],
  "segments": [
    {
      "index": 0,
      "feeling": "same feeling enum",
      "intensity": "low|medium|high",
      "delivery": "short acting note such as soft smile or clenched anger"
    }
  ]
}

Rules:
- Use exact speaker names from the list.
- Infer gender from names, pronouns, role, and dialogue when possible; otherwise neutral.
- Infer feeling from tone, punctuation, word choice, and context for each line.
- Prefer natural emotional acting over exaggerated cartoon performance.
- Keep persona/delivery under 8 words.
- Include one entry for every speaker. Include segment styles for indices you can score confidently.

Speakers: ${JSON.stringify(speakers)}
Lines: ${JSON.stringify(sample)}
Full transcript sample:
${transcript.slice(0, 6000)}`,
      { temperature: 0.2 },
    );

    const speakerProfiles: SpeakerVocalProfile[] = speakers.map((name, index) => {
      const match =
        result.speakers?.find(
          (speaker) =>
            typeof speaker.speaker === 'string' &&
            speaker.speaker.trim().toLowerCase() === name.toLowerCase(),
        ) ?? result.speakers?.[index];

      return {
        speaker: name,
        gender: isGender(match?.gender) ? match.gender : 'neutral',
        defaultFeeling: isFeeling(match?.defaultFeeling)
          ? match.defaultFeeling
          : 'neutral',
        persona: clampDelivery(match?.persona),
      };
    });

    const segmentStyles: Record<number, SegmentVocalStyle> = {};
    for (const entry of result.segments ?? []) {
      if (typeof entry.index !== 'number' || entry.index < 0) continue;
      const feeling = isFeeling(entry.feeling) ? entry.feeling : 'neutral';
      const intensity = isIntensity(entry.intensity) ? entry.intensity : 'medium';
      segmentStyles[entry.index] = {
        feeling,
        intensity,
        delivery: clampDelivery(entry.delivery),
      };
    }

    return { speakers: speakerProfiles, segmentStyles };
  } catch (error) {
    console.warn('Vocal style detection failed, using defaults:', error);
    return {
      speakers: speakers.map((speaker) => ({
        speaker,
        gender: 'neutral',
        defaultFeeling: 'neutral',
      })),
      segmentStyles: {},
    };
  }
}

export function applyVocalStylesToSegments({
  segments,
  segmentStyles,
  speakerProfiles,
}: {
  segments: Segment[];
  segmentStyles: Record<number, SegmentVocalStyle>;
  speakerProfiles: SpeakerVocalProfile[];
}): Segment[] {
  const bySpeaker = new Map(
    speakerProfiles.map((profile) => [profile.speaker, profile]),
  );

  return segments.map((segment, index) => {
    const style = segmentStyles[index];
    const profile = bySpeaker.get(segment.speaker || 'Speaker');
    return {
      ...segment,
      feeling: style?.feeling ?? profile?.defaultFeeling ?? 'neutral',
      intensity: style?.intensity ?? 'medium',
      delivery: style?.delivery ?? profile?.persona,
    };
  });
}
