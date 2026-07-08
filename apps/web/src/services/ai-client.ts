/**
 * Client for the backend AI routes. Model calls run on the API server,
 * which holds API_KEY_302 — the key never ships to the browser.
 *
 * Requires MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API (see metadata.json).
 */

const API_BASE: string =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:4000";

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
		throw new Error(message);
	}
	const payload = (await response.json()) as { result: T };
	return payload.result;
}

export interface TranscriptionResult {
	transcript?: string;
	detectedLanguage?: string;
}

export function transcribeVideo(
	videoBase64: string,
	mimeType: string,
): Promise<TranscriptionResult> {
	return postAi<TranscriptionResult>("transcribe", { videoBase64, mimeType });
}

export function translateText(
	text: string,
	targetLanguage: string,
	sourceLanguage?: string,
): Promise<string> {
	return postAi<string>("translate", { text, targetLanguage, sourceLanguage });
}

/** Returns base64-encoded PCM audio. */
export function generateSpeech(text: string, voice?: string): Promise<string> {
	return postAi<string>("tts", { text, voice });
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

/** Anthropic (Claude) via 302.AI — plans cut ranges from a timestamped transcript. */
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
