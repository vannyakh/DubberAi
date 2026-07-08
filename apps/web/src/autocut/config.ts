import type { AutoCutOptions } from "./silence";

export type AutoCutTrackCategory = "main" | "overlay" | "audio";

export type AutoCutDetectionMode = "silence" | "llm";

export interface AutoCutPipelineConfig extends AutoCutOptions {
	/** How to detect ranges to cut: RMS silence or Anthropic LLM. */
	detectionMode: AutoCutDetectionMode;
	/** LLM: remove filler words and hesitations. */
	llmCutFillers: boolean;
	/** LLM: remove long pauses and dead air. */
	llmCutLongPauses: boolean;
	/** LLM: remove false starts and retakes. */
	llmCutRetakes: boolean;

	/** Close gaps on the whole timeline after cutting. */
	rippleTimeline: boolean;
	/** Include main / master track clips when applying cuts. */
	cutMainTrack: boolean;
	/** Include audio track clips (dub, sfx, music). */
	cutAudioTracks: boolean;
	/** Include overlay video clips. */
	cutOverlayTracks: boolean;

	/** Detect silences from the main/master clip. */
	analyzeFromMain: boolean;
	/** Detect silences from an audio track clip instead. */
	analyzeFromAudio: boolean;
	/** Mix enabled audio sources for analysis (when multiple audio clips selected). */
	mixAudioForAnalysis: boolean;

	/** Apply selected style effects to kept segments after cutting. */
	applyEffectsAfterCut: boolean;
	/** Effect type ids from the effects registry (e.g. blur). */
	selectedEffectTypes: string[];
}

export const DEFAULT_AUTOCUT_PIPELINE: AutoCutPipelineConfig = {
	thresholdDb: -40,
	minSilenceSeconds: 0.6,
	paddingSeconds: 0.08,
	detectionMode: "llm",
	llmCutFillers: true,
	llmCutLongPauses: true,
	llmCutRetakes: true,
	rippleTimeline: true,
	cutMainTrack: true,
	cutAudioTracks: true,
	cutOverlayTracks: false,
	analyzeFromMain: true,
	analyzeFromAudio: false,
	mixAudioForAnalysis: false,
	applyEffectsAfterCut: false,
	selectedEffectTypes: [],
};

export function clipKey({
	trackId,
	elementId,
}: {
	trackId: string;
	elementId: string;
}): string {
	return `${trackId}:${elementId}`;
}

export function parseClipKey(key: string): {
	trackId: string;
	elementId: string;
} {
	const [trackId, elementId] = key.split(":");
	return { trackId, elementId };
}
