/**
 * Client for the backend AI routes. Model calls run on the API server,
 * which holds the provider keys — they never ship to the browser.
 *
 * Requires MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API (see metadata.json).
 */

import {
	DEFAULT_CHUNK_SECONDS,
	DEFAULT_CONCURRENCY,
	extractAudioChunksForTranscription,
	mapPool,
	type ExtractedAudioChunk,
} from "@/dubbing/extract-audio";

const API_BASE: string =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:4000";

export class AiClientError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "AiClientError";
	}
}

/** True for errors that won't recover on retry (bad key, depleted quota…). */
export function isUnrecoverableAiError(error: unknown): boolean {
	if (!(error instanceof AiClientError)) return false;
	return (
		error.status >= 400 &&
		error.status < 500 &&
		error.status !== 408 &&
		error.status !== 429
	);
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`${API_BASE}/api/ai/${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		let message = `AI request failed (${response.status})`;
		try {
			const payload = (await response.json()) as { message?: string };
			if (payload?.message) message = payload.message;
		} catch {
			// keep the status-based message
		}
		throw new AiClientError(message, response.status);
	}
	const payload = (await response.json()) as { result: T };
	return payload.result;
}

export interface TranscriptionResult {
	transcript?: string;
	detectedLanguage?: string;
}

function formatMmSs(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Shift `[MM:SS]` timestamps in a chunk transcript by `offsetSeconds`. */
function offsetTranscriptTimestamps(
	transcript: string,
	offsetSeconds: number,
): string {
	if (!transcript.trim() || offsetSeconds <= 0) return transcript;
	return transcript.replace(
		/\[(\d{2}):(\d{2})\]/g,
		(_match, mm: string, ss: string) => {
			const local = Number(mm) * 60 + Number(ss);
			return `[${formatMmSs(local + offsetSeconds)}]`;
		},
	);
}

/**
 * Transcribe one audio blob. Prefer {@link transcribeMediaFile} so long
 * media is split into parallel chunk uploads instead of one huge payload.
 */
export function transcribeVideo(
	videoBase64: string,
	mimeType: string,
	language?: string,
): Promise<TranscriptionResult> {
	return postAi<TranscriptionResult>("transcribe", {
		videoBase64,
		mimeType,
		language,
	});
}

/**
 * Split media into short WAV chunks and transcribe them in parallel.
 * Merges timed transcript lines with absolute offsets.
 */
export async function transcribeMediaFile({
	file,
	chunkSeconds = DEFAULT_CHUNK_SECONDS,
	concurrency = DEFAULT_CONCURRENCY,
	language,
	onChunkProgress,
}: {
	file: File;
	chunkSeconds?: number;
	concurrency?: number;
	/** Spoken language hint (e.g. "Chinese"); omit for auto-detect. */
	language?: string;
	onChunkProgress?: (done: number, total: number) => void;
}): Promise<TranscriptionResult> {
	const { chunks } = await extractAudioChunksForTranscription({
		file,
		chunkSeconds,
	});
	if (chunks.length === 0) {
		throw new Error("The selected video has no audio track to transcribe");
	}

	let completed = 0;
	const results = await mapPool(
		chunks,
		concurrency,
		async (chunk: ExtractedAudioChunk) => {
			try {
				const result = await transcribeVideo(
				chunk.base64,
				chunk.mimeType,
				language,
			);
				completed += 1;
				onChunkProgress?.(completed, chunks.length);
				return {
					startSeconds: chunk.startSeconds,
					transcript: result.transcript ?? "",
					detectedLanguage: result.detectedLanguage ?? null,
				};
			} catch (error) {
				// Silent/music-only chunks used to 500 with this message; treat as empty.
				const message = error instanceof Error ? error.message : "";
				if (/no dialogue/i.test(message)) {
					completed += 1;
					onChunkProgress?.(completed, chunks.length);
					return {
						startSeconds: chunk.startSeconds,
						transcript: "",
						detectedLanguage: null,
					};
				}
				throw error;
			}
		},
	);

	const lines: string[] = [];
	let detectedLanguage: string | null = null;
	for (const part of results) {
		if (part.detectedLanguage && !detectedLanguage) {
			detectedLanguage = part.detectedLanguage;
		}
		const shifted = offsetTranscriptTimestamps(
			part.transcript,
			part.startSeconds,
		).trim();
		if (shifted) lines.push(shifted);
	}

	const transcript = lines.join("\n").trim();
	if (!transcript) {
		throw new Error("Transcription returned no dialogue");
	}
	return { transcript, detectedLanguage: detectedLanguage ?? undefined };
}

export function translateText(
	text: string,
	targetLanguage: string,
	sourceLanguage?: string,
): Promise<string> {
	return postAi<string>("translate", { text, targetLanguage, sourceLanguage });
}

/** Returns base64-encoded PCM audio. */
export function generateSpeech(
	text: string,
	voice?: string,
	style?: {
		feeling?: string;
		intensity?: string;
		delivery?: string;
		persona?: string;
		pace?: string;
		voiceTone?: string;
	},
): Promise<string> {
	return postAi<string>("tts", { text, voice, style });
}

export interface SpeakerVocalProfileResult {
	speaker: string;
	gender: "female" | "male" | "neutral";
	defaultFeeling:
		| "neutral"
		| "warm"
		| "calm"
		| "excited"
		| "angry"
		| "sad"
		| "serious"
		| "playful"
		| "fearful"
		| "romantic"
		| "urgent";
	persona?: string;
	/** Desired voice timbre for casting (e.g. "warm", "gravelly"). */
	voiceTone?: string;
	pace?: "slow" | "normal" | "fast";
	age?: "child" | "young" | "adult" | "mature";
}

export interface DetectVocalStylesClientResult {
	speakers: SpeakerVocalProfileResult[];
	segmentStyles: Record<
		number,
		{
			feeling: SpeakerVocalProfileResult["defaultFeeling"];
			intensity: "low" | "medium" | "high";
			delivery?: string;
		}
	>;
}

/** Infer speaker gender + emotional delivery from transcript/segments. */
export function detectVocalStyles(body: {
	transcript: string;
	segments: Array<{
		time: number;
		speaker: string;
		text: string;
		raw?: string;
	}>;
}): Promise<DetectVocalStylesClientResult> {
	return postAi<DetectVocalStylesClientResult>("vocal-styles", body);
}

/** Returns base64-encoded PCM audio. */
export function generateMultiSpeakerSpeech(
	text: string,
	speakerVoices: Record<string, string>,
): Promise<string> {
	return postAi<string>("tts-multi", { text, speakerVoices });
}

export interface AutoCutPlanRequest {
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

export type AgentCutIntent =
	| "autocut"
	| "trim-dialogue"
	| "remove-pauses"
	| "story-tighten"
	| "audio-cleanup"
	| "text-timing"
	| "footage-selection"
	| "external-source"
	| "unknown";

export interface AgentCutClipSummary {
	name: string;
	trackLabel: string;
	category: "main" | "overlay" | "audio";
	durationSeconds?: number;
}

export interface AgentCutAction {
	type:
		| "cut"
		| "trim"
		| "audio"
		| "text"
		| "footage"
		| "external_source";
	label: string;
	reason?: string;
	payload?: unknown;
}

export interface AgentCutPlanRequest {
	prompt: string;
	transcript: string;
	durationSeconds: number;
	minCutSeconds: number;
	paddingSeconds: number;
	clipSummaries?: AgentCutClipSummary[];
}

export interface AgentCutPlanResult {
	intent: AgentCutIntent;
	summary: string;
	status: "planned" | "needs_clarification";
	cuts: AutoCutCutRange[];
	actions: AgentCutAction[];
	questions: string[];
}

/** Anthropic (Claude) — plans cut ranges from a timestamped transcript. */
export function planAutoCutRanges(
	body: AutoCutPlanRequest,
): Promise<AutoCutCutRange[]> {
	return postAi<AutoCutCutRange[]>("autocut-plan", body);
}

export function planAgentCut(
	body: AgentCutPlanRequest,
): Promise<AgentCutPlanResult> {
	return postAi<AgentCutPlanResult>("agent-cut-plan", body);
}
