import type { EditorCore } from "@/core";
import { decodeAudioToFloat32 } from "@/media/audio";
import { extractAudioForTranscription } from "@/dubbing/extract-audio";
import {
	planAutoCutRanges,
	transcribeVideo,
	type AgentCutAction,
	type AgentCutPlanResult,
} from "@/services/ai-client";
import { runAgentCutRealtime } from "@/services/agent-cut-ws";
import type { SilenceRange } from "./silence";
import {
	applyAutoCutPipeline,
	type ApplyCutsResult,
} from "./apply-cuts";
import { useAutoCutStore } from "./autocut-store";
import { DEFAULT_AUTOCUT_PIPELINE } from "./config";
import { normalizeLlmCutRanges } from "./llm-cuts";
import { detectSilencesWithWasm, yieldToUi } from "./silence-wasm";
import {
	filterEnabledClips,
	listCuttableClips,
	toCuttableRef,
} from "./track-list";

const RMS_PIPELINE_STEPS = [
	"Preparing timeline clips",
	"Decoding audio",
	"Detecting silences (Rust)",
	"Review cut ranges",
] as const;

const LLM_PIPELINE_STEPS = [
	"Preparing timeline clips",
	"Extracting speech audio",
	"Transcribing with AI",
	"Planning cuts",
	"Review cut ranges",
] as const;

const AGENT_PIPELINE_STEPS = [
	"Preparing context",
	"Extracting speech audio",
	"Transcribing",
	"Classifying request",
	"Planning edits",
	"Preparing cut results",
] as const;

const APPLY_PIPELINE_STEPS = [
	"Applying cuts to timeline",
	"Rippling tracks",
	"Finalizing edit",
] as const;

async function getClipMediaFile({
	editor,
	trackId,
	elementId,
}: {
	editor: EditorCore;
	trackId: string;
	elementId: string;
}): Promise<File | null> {
	const track = editor.timeline.getTrackById({ trackId });
	const element = track?.elements.find((el) => el.id === elementId);
	if (!element || !("mediaId" in element)) return null;

	const asset = editor.media
		.getAssets()
		.find((mediaAsset) => mediaAsset.id === element.mediaId);
	return asset?.file ?? null;
}

async function decodeClipSamples({
	editor,
	trackId,
	elementId,
}: {
	editor: EditorCore;
	trackId: string;
	elementId: string;
}): Promise<{ samples: Float32Array; sampleRate: number } | null> {
	const file = await getClipMediaFile({ editor, trackId, elementId });
	if (!file) return null;
	return decodeAudioToFloat32({ audioBlob: file });
}

function mixSampleBuffers(
	buffers: Array<{ samples: Float32Array; sampleRate: number }>,
): { samples: Float32Array; sampleRate: number } {
	if (buffers.length === 0) {
		return { samples: new Float32Array(0), sampleRate: 44100 };
	}
	const sampleRate = buffers[0].sampleRate;
	const maxLength = Math.max(...buffers.map((buffer) => buffer.samples.length));
	const mixed = new Float32Array(maxLength);

	for (const buffer of buffers) {
		for (let i = 0; i < buffer.samples.length; i++) {
			mixed[i] += buffer.samples[i] / buffers.length;
		}
	}

	return { samples: mixed, sampleRate };
}

function resolveAnalysisClipKey({
	editor,
}: {
	editor: EditorCore;
}): string | null {
	const store = useAutoCutStore.getState();
	const { pipeline, enabledClips, analysisSourceKey } = store;
	const clips = listCuttableClips({ editor });
	const enabled = filterEnabledClips({
		clips,
		enabledKeys: enabledClips,
		pipeline,
	});

	if (analysisSourceKey && enabledClips[analysisSourceKey]) {
		return analysisSourceKey;
	}

	if (pipeline.analyzeFromMain) {
		const main = enabled.find((clip) => clip.category === "main");
		if (main) return main.key;
	}

	if (pipeline.analyzeFromAudio) {
		const audio = enabled.find((clip) => clip.category === "audio");
		if (audio) return audio.key;
	}

	return enabled[0]?.key ?? clips[0]?.key ?? null;
}

function setStep(index: number, progress?: { current: number; total: number }) {
	useAutoCutStore.getState().setPipelineStep(index, progress ?? null);
}

function createAgentMessage(params: {
	role: "user" | "assistant" | "system";
	content: string;
}) {
	return {
		id: `${params.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		role: params.role,
		content: params.content,
		createdAt: Date.now(),
	};
}

function mapAgentActionsToStore(
	actions: AgentCutAction[],
): Array<{
	type: "cut" | "trim" | "audio" | "text" | "footage" | "external_source";
	label: string;
	reason?: string;
	payload?: unknown;
}> {
	return actions.map((action) => ({
		type: action.type,
		label: action.label,
		reason: action.reason,
		payload: action.payload,
	}));
}

async function transcribeAnalysisClip({
	editor,
	analysisKey,
}: {
	editor: EditorCore;
	analysisKey: string;
}): Promise<{ transcript: string; durationSeconds: number }> {
	const [trackId, elementId] = analysisKey.split(":");
	const file = await getClipMediaFile({ editor, trackId, elementId });
	if (!file) {
		throw new Error("Could not load media for planning");
	}

	const { base64, mimeType } = await extractAudioForTranscription({ file });
	const transcription = await transcribeVideo(base64, mimeType);
	const transcript = transcription.transcript?.trim() ?? "";
	if (!transcript) {
		throw new Error("Transcription returned no speech to analyze");
	}
	if (/^\s*I(?:'m| am)? (?:sorry|cannot|can't)/i.test(transcript)) {
		throw new Error("Transcription failed — try a shorter clip");
	}

	const decoded = await decodeClipSamples({ editor, trackId, elementId });
	const durationSeconds =
		decoded && decoded.sampleRate > 0
			? decoded.samples.length / decoded.sampleRate
			: 0;
	if (durationSeconds <= 0) {
		throw new Error("Could not determine clip duration");
	}

	return { transcript, durationSeconds };
}

async function runRmsSilenceDetection({
	editor,
	analysisKey,
	enabled,
}: {
	editor: EditorCore;
	analysisKey: string;
	enabled: ReturnType<typeof filterEnabledClips>;
}): Promise<{ silences: SilenceRange[]; durationSeconds: number }> {
	const store = useAutoCutStore.getState();
	const { pipeline } = store;

	setStep(1);
	await yieldToUi();

	let samples: Float32Array;
	let sampleRate: number;

	if (pipeline.mixAudioForAnalysis && enabled.length > 1) {
		const buffers: Array<{ samples: Float32Array; sampleRate: number }> = [];
		for (let index = 0; index < enabled.length; index++) {
			const clip = enabled[index];
			setStep(1, { current: index + 1, total: enabled.length });
			const decoded = await decodeClipSamples({
				editor,
				trackId: clip.trackId,
				elementId: clip.elementId,
			});
			if (decoded) buffers.push(decoded);
			await yieldToUi();
		}
		const mixed = mixSampleBuffers(buffers);
		samples = mixed.samples;
		sampleRate = mixed.sampleRate;
	} else {
		const [trackId, elementId] = analysisKey.split(":");
		const decoded = await decodeClipSamples({ editor, trackId, elementId });
		if (!decoded) {
			throw new Error("Could not decode audio for the analysis clip");
		}
		samples = decoded.samples;
		sampleRate = decoded.sampleRate;
	}

	setStep(2);
	const durationSeconds = samples.length / sampleRate;
	const silences = await detectSilencesWithWasm({
		samples,
		sampleRate,
		options: pipeline,
	});

	setStep(3);
	return { silences, durationSeconds };
}

async function runLlmCutDetection({
	editor,
	analysisKey,
}: {
	editor: EditorCore;
	analysisKey: string;
}): Promise<{ silences: SilenceRange[]; durationSeconds: number }> {
	const store = useAutoCutStore.getState();
	const { pipeline } = store;

	setStep(1);
	await yieldToUi();
	setStep(2);
	await yieldToUi();
	const { transcript, durationSeconds } = await transcribeAnalysisClip({
		editor,
		analysisKey,
	});

	setStep(3);
	await yieldToUi();
	const cuts = await planAutoCutRanges({
		transcript,
		durationSeconds,
		minCutSeconds: pipeline.minSilenceSeconds,
		paddingSeconds: pipeline.paddingSeconds,
		cutFillers: pipeline.llmCutFillers,
		cutLongPauses: pipeline.llmCutLongPauses,
		cutRetakes: pipeline.llmCutRetakes,
	});

	const silences = normalizeLlmCutRanges({
		cuts,
		durationSeconds,
		minCutSeconds: pipeline.minSilenceSeconds,
		paddingSeconds: pipeline.paddingSeconds,
	});

	setStep(4);
	return { silences, durationSeconds };
}

export async function runAgentCutPlan({
	editor,
	prompt,
}: {
	editor: EditorCore;
	prompt: string;
}): Promise<AgentCutPlanResult> {
	const store = useAutoCutStore.getState();
	const { pipeline, enabledClips, agentSessionId } = store;
	const clips = listCuttableClips({ editor });
	const enabled = filterEnabledClips({
		clips,
		enabledKeys: enabledClips,
		pipeline,
	});

	if (enabled.length === 0) {
		throw new Error("Select at least one track clip to analyze");
	}

	const analysisKey = resolveAnalysisClipKey({ editor });
	if (!analysisKey) {
		throw new Error("No clip available for analysis");
	}

	store.setAnalysisSourceKey(analysisKey);
	store.pushAgentMessage(createAgentMessage({ role: "user", content: prompt }));

	try {
		await yieldToUi();
		const { transcript, durationSeconds } = await transcribeAnalysisClip({
			editor,
			analysisKey,
		});

		await yieldToUi();
		const clipSummaries = enabled.map((clip) => ({
			name: clip.element.name,
			trackLabel: clip.trackLabel,
			category: clip.category,
			durationSeconds:
				typeof clip.element.duration === "number"
					? clip.element.duration / 120000
					: undefined,
		}));

		const result = await runAgentCutRealtime(
			{
				sessionId: agentSessionId,
				prompt,
				transcript,
				durationSeconds,
				minCutSeconds: pipeline.minSilenceSeconds,
				paddingSeconds: pipeline.paddingSeconds,
				clipSummaries,
			},
			{
				onStatus: (event) => {
					useAutoCutStore.getState().pushAgentMessage(
						createAgentMessage({
							role: "system",
							content: event.message,
						}),
					);
				},
				onError: (message) => {
					useAutoCutStore.getState().pushAgentMessage(
						createAgentMessage({
							role: "assistant",
							content: message,
						}),
					);
				},
			},
		);

		const silences = normalizeLlmCutRanges({
			cuts: result.cuts,
			durationSeconds,
			minCutSeconds: pipeline.minSilenceSeconds,
			paddingSeconds: pipeline.paddingSeconds,
		});

		store.setDetection({
			silences,
			analyzedDurationSeconds: durationSeconds,
		});
		store.setAgentPlan({
			intent: result.intent,
			summary: result.summary,
			status: result.status,
			cuts: silences,
			actions: mapAgentActionsToStore(result.actions),
			questions: result.questions,
		});
		store.pushAgentMessage(
			createAgentMessage({
				role: "assistant",
				content:
					result.status === "needs_clarification"
						? [result.summary, ...result.questions.map((question) => `- ${question}`)].join(
								"\n",
						  )
						: result.summary,
			}),
		);
		return result;
	} catch (error) {
		throw error;
	}
}

/**
 * Detect cut ranges from selected clips — Rust RMS or Anthropic LLM.
 */
export async function runCutDetection({
	editor,
}: {
	editor: EditorCore;
}): Promise<void> {
	const store = useAutoCutStore.getState();
	const { pipeline, enabledClips } = store;

	const clips = listCuttableClips({ editor });
	const enabled = filterEnabledClips({
		clips,
		enabledKeys: enabledClips,
		pipeline,
	});

	if (enabled.length === 0) {
		store.setError("Select at least one track clip to analyze");
		return;
	}

	const analysisKey = resolveAnalysisClipKey({ editor });
	if (!analysisKey) {
		store.setError("No clip available for analysis");
		return;
	}

	const isLlm =
		(pipeline.detectionMode ?? DEFAULT_AUTOCUT_PIPELINE.detectionMode) ===
		"llm";

	store.setAnalysisSourceKey(analysisKey);
	store.setError(null);
	store.beginPipeline(
		isLlm ? [...LLM_PIPELINE_STEPS] : [...RMS_PIPELINE_STEPS],
	);
	setStep(0);
	store.setStatus("analyzing");

	try {
		const result = isLlm
			? await runLlmCutDetection({ editor, analysisKey })
			: await runRmsSilenceDetection({ editor, analysisKey, enabled });

		store.setDetection({
			silences: result.silences,
			analyzedDurationSeconds: result.durationSeconds,
		});
		store.setStatus("idle");
		store.clearPipeline();
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Cut analysis failed",
		);
		store.clearPipeline();
		throw error;
	}
}

/** @deprecated Use runCutDetection */
export const runSilenceDetection = runCutDetection;

/** Apply detected silences to all enabled track clips (single undo step). */
export async function runApplyCuts({
	editor,
}: {
	editor: EditorCore;
}): Promise<ApplyCutsResult | null> {
	const store = useAutoCutStore.getState();
	const { pipeline, enabledClips, silences, analysisSourceKey } = store;

	if (!analysisSourceKey || silences.length === 0) return null;

	const clips = listCuttableClips({ editor });
	const enabled = filterEnabledClips({
		clips,
		enabledKeys: enabledClips,
		pipeline,
	});

	if (enabled.length === 0) {
		store.setError("Select at least one clip to cut");
		return null;
	}

	store.beginPipeline([...APPLY_PIPELINE_STEPS]);
	setStep(0);
	store.setError(null);
	store.setStatus("applying");

	try {
		await yieldToUi();
		setStep(1);

		const result = applyAutoCutPipeline({
			editor,
			targets: enabled.map(toCuttableRef),
			primaryTarget: toCuttableRef(
				enabled.find((clip) => clip.key === analysisSourceKey) ??
					enabled[0],
			),
			sourceSilences: silences,
			pipeline,
		});

		setStep(2);
		store.setStatus("done");
		store.clearPipeline();
		return result;
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Applying cuts failed",
		);
		store.clearPipeline();
		throw error;
	}
}
