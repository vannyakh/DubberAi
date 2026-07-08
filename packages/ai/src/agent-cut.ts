import { chatJson } from "./chat";
import { AGENT_CUT_MODEL } from "./config";

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

export interface AgentCutRange {
	startSeconds: number;
	endSeconds: number;
	reason?: string;
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

export interface AgentCutPlanInput {
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
	cuts: AgentCutRange[];
	actions: AgentCutAction[];
	questions: string[];
}

interface IntentClassificationResult {
	intent: AgentCutIntent;
	summary: string;
	confidence?: "high" | "medium" | "low";
	needsClarification?: boolean;
	questions?: string[];
}

interface NormalizedIntentClassificationResult {
	intent: AgentCutIntent;
	summary: string;
	confidence: "high" | "medium" | "low";
	needsClarification: boolean;
	questions: string[];
}

export async function classifyAgentCutIntent(
	input: Pick<AgentCutPlanInput, "prompt" | "transcript">,
): Promise<NormalizedIntentClassificationResult> {
	const prompt = `You classify editing requests for a video editing assistant.

USER REQUEST:
${input.prompt}

TRANSCRIPT EXCERPT:
${input.transcript.slice(0, 4000)}

Return JSON only:
{
  "intent": "autocut | trim-dialogue | remove-pauses | story-tighten | audio-cleanup | text-timing | footage-selection | external-source | unknown",
  "summary": "one short sentence describing the editing goal",
  "confidence": "high | medium | low",
  "needsClarification": true,
  "questions": ["question 1", "question 2"]
}`;

	const result = await chatJson<IntentClassificationResult>(prompt, {
		model: AGENT_CUT_MODEL,
		json: true,
		temperature: 0.1,
	});

	return {
		intent: result.intent ?? "unknown",
		summary: result.summary?.trim() || "Plan edits from the requested intent.",
		confidence: result.confidence ?? "low",
		needsClarification: result.needsClarification ?? result.intent === "unknown",
		questions: (result.questions ?? []).filter(Boolean).slice(0, 3),
	};
}

export async function planAgentCut(
	input: AgentCutPlanInput,
): Promise<AgentCutPlanResult> {
	const classification = await classifyAgentCutIntent(input);
	if (classification.needsClarification) {
		return {
			intent: classification.intent,
			summary: classification.summary,
			status: "needs_clarification",
			cuts: [],
			actions: [],
			questions:
				classification.questions.length > 0
					? classification.questions
					: [
							"What kind of edit do you want first: cuts, audio cleanup, text timing, or footage changes?",
							"Should the agent focus on the full clip or only a specific section?",
					  ],
		};
	}
	const clipSummaryText =
		input.clipSummaries?.length
			? input.clipSummaries
					.map(
						(clip, index) =>
							`${index + 1}. [${clip.category}] ${clip.trackLabel} / ${clip.name}${
								clip.durationSeconds
									? ` (${clip.durationSeconds.toFixed(2)}s)`
									: ""
							}`,
					)
					.join("\n")
			: "No clip summaries provided.";

	const prompt = `You are an editing agent that creates a structured cut/edit plan.

INTENT:
${classification.intent}

INTENT SUMMARY:
${classification.summary}

USER REQUEST:
${input.prompt}

TOTAL DURATION:
${input.durationSeconds.toFixed(2)} seconds

TRANSCRIPT:
${input.transcript}

AVAILABLE CLIPS:
${clipSummaryText}

RULES:
- Return only structured JSON.
- If the request is mostly about removing pauses, dead air, filler, repeated lines, or tightening pacing, include precise cut ranges.
- Every cut must satisfy 0 <= startSeconds < endSeconds <= ${input.durationSeconds.toFixed(2)}.
- Only include cuts that remain at least ${input.minCutSeconds.toFixed(2)} seconds long after padding.
- Keep the summary concise and user-facing.
- Actions may include cut, trim, audio, text, footage, or external_source.
- external_source actions are proposals only and must not assume execution.
- Use transcript evidence when possible.

Return JSON only:
{
  "summary": "short summary",
  "cuts": [
    { "startSeconds": 12.5, "endSeconds": 14.8, "reason": "long pause" }
  ],
  "actions": [
    { "type": "cut", "label": "Remove long pause", "reason": "Tighten pacing", "payload": { "startSeconds": 12.5, "endSeconds": 14.8 } }
  ]
}`;

	const result = await chatJson<{
		summary?: string;
		cuts?: AgentCutRange[];
		actions?: AgentCutAction[];
		questions?: string[];
	}>(prompt, {
		model: AGENT_CUT_MODEL,
		json: true,
		temperature: 0.2,
	});

	const cuts = (result.cuts ?? []).filter(
		(cut) =>
			Number.isFinite(cut.startSeconds) &&
			Number.isFinite(cut.endSeconds) &&
			cut.endSeconds > cut.startSeconds,
	);

	return {
		intent: classification.intent,
		summary: result.summary?.trim() || classification.summary,
		status: "planned",
		cuts,
		actions: result.actions ?? [],
		questions: [],
	};
}
