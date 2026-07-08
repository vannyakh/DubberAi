import type { SilenceRange } from "./silence";

export interface LlmCutPlanRequest {
	transcript: string;
	durationSeconds: number;
	minCutSeconds: number;
	paddingSeconds: number;
	cutFillers?: boolean;
	cutLongPauses?: boolean;
	cutRetakes?: boolean;
}

export interface LlmCutRange {
	startSeconds: number;
	endSeconds: number;
	reason?: string;
}

/** Normalize, pad, and filter LLM cut ranges into silence-compatible ranges. */
export function normalizeLlmCutRanges({
	cuts,
	durationSeconds,
	minCutSeconds,
	paddingSeconds,
}: {
	cuts: LlmCutRange[];
	durationSeconds: number;
	minCutSeconds: number;
	paddingSeconds: number;
}): SilenceRange[] {
	const sorted = [...cuts]
		.map((cut) => ({
			startSeconds: Math.max(0, cut.startSeconds),
			endSeconds: Math.min(durationSeconds, cut.endSeconds),
		}))
		.filter((cut) => cut.endSeconds > cut.startSeconds)
		.sort((a, b) => a.startSeconds - b.startSeconds);

	const merged: SilenceRange[] = [];
	for (const cut of sorted) {
		const last = merged.at(-1);
		if (last && cut.startSeconds <= last.endSeconds) {
			last.endSeconds = Math.max(last.endSeconds, cut.endSeconds);
		} else {
			merged.push({ ...cut });
		}
	}

	const padded: SilenceRange[] = [];
	for (const cut of merged) {
		const startSeconds = cut.startSeconds + paddingSeconds;
		const endSeconds = cut.endSeconds - paddingSeconds;
		if (endSeconds - startSeconds >= minCutSeconds) {
			padded.push({ startSeconds, endSeconds });
		}
	}

	return padded;
}
