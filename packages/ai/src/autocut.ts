import { chatJson } from './chat';
import { AUTOCUT_MODEL } from './config';

export interface AutoCutPlanInput {
	transcript: string;
	durationSeconds: number;
	minCutSeconds: number;
	paddingSeconds: number;
	cutFillers?: boolean;
	cutLongPauses?: boolean;
	cutRetakes?: boolean;
}

export interface AutoCutCutRange {
	startSeconds: number;
	endSeconds: number;
	reason?: string;
}

export async function planAutoCutRanges(
	input: AutoCutPlanInput,
): Promise<AutoCutCutRange[]> {
	const goals: string[] = [];
	if (input.cutLongPauses !== false) {
		goals.push('long pauses, dead air, and silence between spoken segments');
	}
	if (input.cutFillers) {
		goals.push(
			'filler words and verbal hesitations (um, uh, like, you know) when removable without losing meaning',
		);
	}
	if (input.cutRetakes) {
		goals.push('false starts, stumbles, repeated lines, and obvious retakes');
	}
	if (goals.length === 0) {
		goals.push('long pauses and dead air between spoken segments');
	}

	const prompt = `You are a professional video editor planning precise auto-cuts from a timestamped transcript.

TRANSCRIPT:
${input.transcript}

TOTAL MEDIA DURATION: ${input.durationSeconds.toFixed(2)} seconds

TASK:
Identify contiguous time ranges to REMOVE from the final edit.
Focus on: ${goals.join('; ')}.

RULES:
- Times are seconds from the start of the source media (0 = beginning).
- Every range must satisfy: 0 <= startSeconds < endSeconds <= ${input.durationSeconds.toFixed(2)}.
- Only include ranges at least ${input.minCutSeconds.toFixed(2)} seconds long after accounting for padding.
- Leave about ${input.paddingSeconds.toFixed(2)} seconds of breathing room before/after kept speech.
- Do NOT cut mid-word or mid-sentence unless it is clearly a retake or filler removal.
- Ranges must not overlap.
- Use transcript timestamps to infer boundaries when possible.

Return JSON only:
{
  "cuts": [
    { "startSeconds": 12.5, "endSeconds": 14.8, "reason": "long pause" }
  ]
}`;

	const result = await chatJson<{ cuts: AutoCutCutRange[] }>(prompt, {
		model: AUTOCUT_MODEL,
		json: true,
		temperature: 0.2,
	});

	return (result.cuts ?? []).filter(
		(cut) =>
			Number.isFinite(cut.startSeconds) &&
			Number.isFinite(cut.endSeconds) &&
			cut.endSeconds > cut.startSeconds,
	);
}
