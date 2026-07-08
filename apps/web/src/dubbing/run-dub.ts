import {
	transcribeVideo,
	translateText,
	generateSpeech,
} from "@/services/ai-client";
import { parseSegments, fileToBase64, VOICES } from "@dubbercut/utils";
import { extractAudioForTranscription } from "./extract-audio";
import type { Segment } from "@dubbercut/types";
import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/media/types";
import { useDubbingStore } from "./dubbing-store";
import {
	applySegmentsAsTextElements,
	applySegmentedDubToTimeline,
	ensureSegmentTimeline,
	getMainTrackDurationSeconds,
	type DubClip,
} from "./apply-to-timeline";

class DubCancelledError extends Error {
	constructor() {
		super("Dubbing cancelled");
		this.name = "DubCancelledError";
	}
}

function assertNotCancelled(signal?: AbortSignal): void {
	if (signal?.aborted) throw new DubCancelledError();
}

function setStageProgress(percent: number): void {
	useDubbingStore.getState().setOverlayPercent(percent);
}

/** Rotate distinct TTS voices across speakers when the user hasn't mapped them. */
function ensureSpeakerVoices(segments: Segment[]): void {
	const store = useDubbingStore.getState();
	const { speakerVoices, defaultVoice } = store;
	const voiceIds = VOICES.map((voice) => voice.id);
	const speakers = [
		...new Set(segments.map((segment) => segment.speaker || "Speaker")),
	];

	speakers.forEach((speaker, index) => {
		if (speakerVoices[speaker]) return;
		const preferred =
			voiceIds[(index + voiceIds.indexOf(defaultVoice)) % voiceIds.length] ??
			defaultVoice;
		store.setSpeakerVoice(speaker, preferred);
	});
}

function voiceForSpeaker({
	speaker,
	speakerVoices,
	defaultVoice,
}: {
	speaker: string;
	speakerVoices: Record<string, string>;
	defaultVoice: string;
}): string {
	return speakerVoices[speaker] || defaultVoice;
}

export async function runTranscription({
	asset,
	signal,
}: {
	asset: MediaAsset;
	signal?: AbortSignal;
}): Promise<void> {
	const store = useDubbingStore.getState();
	store.setError(null);
	store.setStatus("transcribing");
	setStageProgress(4);
	try {
		assertNotCancelled(signal);
		setStageProgress(12);

		let payload: { base64: string; mimeType: string };
		try {
			payload = await extractAudioForTranscription({ file: asset.file });
		} catch (extractError) {
			console.warn(
				"Audio extraction failed, sending original file:",
				extractError,
			);
			assertNotCancelled(signal);
			payload = {
				base64: await fileToBase64(asset.file),
				mimeType: asset.file.type || "video/mp4",
			};
		}

		assertNotCancelled(signal);
		setStageProgress(28);

		const tick = window.setInterval(() => {
			const current = useDubbingStore.getState().overlayPercent;
			if (current < 78) {
				useDubbingStore.getState().setOverlayPercent(current + 2);
			}
		}, 450);

		let result: Awaited<ReturnType<typeof transcribeVideo>>;
		try {
			result = await transcribeVideo(payload.base64, payload.mimeType);
		} finally {
			window.clearInterval(tick);
		}

		assertNotCancelled(signal);
		setStageProgress(88);

		const transcript: string = result?.transcript ?? "";
		if (!transcript) {
			throw new Error("Transcription returned no dialogue");
		}
		if (
			/^\s*I(?:'m| am)? (?:sorry|cannot|can't)/i.test(transcript) ||
			/cannot (directly )?access|unable to (provide|access|process)|i am an ai/i.test(
				transcript,
			)
		) {
			throw new Error(
				"The AI could not process this file's audio. Try a shorter main-track clip (wav/mp4/webm).",
			);
		}
		const segments = parseSegments(transcript);
		store.setTranscription({
			transcript,
			segments,
			detectedLanguage: result?.detectedLanguage ?? null,
		});
		ensureSpeakerVoices(segments);
		setStageProgress(100);
		store.setStatus("idle");
	} catch (error) {
		if (error instanceof DubCancelledError || signal?.aborted) {
			throw new DubCancelledError();
		}
		store.setError(
			error instanceof Error ? error.message : "Transcription failed",
		);
		throw error;
	}
}

export async function runTranslation({
	signal,
}: {
	signal?: AbortSignal;
} = {}): Promise<void> {
	const store = useDubbingStore.getState();
	const { transcript, targetLang, detectedLanguage } = store;
	if (!transcript) return;
	store.setError(null);
	store.setStatus("translating");
	setStageProgress(8);
	try {
		assertNotCancelled(signal);
		setStageProgress(35);
		const translated =
			(await translateText(
				transcript,
				targetLang,
				detectedLanguage ?? undefined,
			)) ?? "";
		assertNotCancelled(signal);
		setStageProgress(85);
		if (!translated) {
			throw new Error("Translation returned no text");
		}
		const segments = parseSegments(translated);
		store.setTranslation({
			text: translated,
			segments,
		});
		ensureSpeakerVoices(segments);
		setStageProgress(100);
		store.setStatus("idle");
	} catch (error) {
		if (error instanceof DubCancelledError || signal?.aborted) {
			throw new DubCancelledError();
		}
		store.setError(
			error instanceof Error ? error.message : "Translation failed",
		);
		throw error;
	}
}

async function generateSegmentClips({
	segments,
	speakerVoices,
	defaultVoice,
	signal,
}: {
	segments: Segment[];
	speakerVoices: Record<string, string>;
	defaultVoice: string;
	signal?: AbortSignal;
}): Promise<DubClip[]> {
	const store = useDubbingStore.getState();
	const spoken = segments
		.map((segment, index) => ({ segment, index }))
		.filter(({ segment }) => segment.text.trim().length > 0);

	if (spoken.length === 0) {
		throw new Error("No dialogue lines available for speech synthesis");
	}

	store.setProgress({ current: 0, total: spoken.length });
	store.setOverlayPercent(4);

	// Segment-by-segment parallel TTS: synthesize lines concurrently, keep order.
	const concurrency = Math.min(4, spoken.length);
	const clips: Array<DubClip | null> = Array.from(
		{ length: spoken.length },
		() => null,
	);
	let completed = 0;
	let cursor = 0;

	async function worker() {
		while (cursor < spoken.length) {
			assertNotCancelled(signal);
			const jobIndex = cursor++;
			const { segment } = spoken[jobIndex];
			const voice = voiceForSpeaker({
				speaker: segment.speaker || "Speaker",
				speakerVoices,
				defaultVoice,
			});
			const audio = await generateSpeech(segment.text.trim(), voice);
			assertNotCancelled(signal);
			if (!audio) {
				throw new Error(
					`Speech synthesis returned no audio for segment ${jobIndex + 1}`,
				);
			}
			clips[jobIndex] = {
				segment: {
					...segment,
					speaker: segment.speaker || "Speaker 1",
				},
				audioBase64: audio,
			};
			completed += 1;
			store.setProgress({ current: completed, total: spoken.length });
			store.setOverlayPercent(
				Math.round((completed / spoken.length) * 100),
			);
		}
	}

	await Promise.all(
		Array.from({ length: concurrency }, () => worker()),
	);

	const ordered = clips.filter((clip): clip is DubClip => clip != null);
	if (ordered.length === 0) {
		throw new Error("No dialogue lines available for speech synthesis");
	}
	return ordered;
}

export async function runSpeechAndApply({
	editor,
	signal,
}: {
	editor: EditorCore;
	signal?: AbortSignal;
}): Promise<void> {
	const store = useDubbingStore.getState();
	const { translatedText, translationSegments, speakerVoices, defaultVoice } =
		store;
	if (!translatedText) return;
	ensureSpeakerVoices(translationSegments);
	const voices = useDubbingStore.getState().speakerVoices;
	const footageEnd = getMainTrackDurationSeconds(editor);
	const timedSegments = ensureSegmentTimeline({
		segments: translationSegments,
		footageEndSeconds: footageEnd,
	});

	store.setError(null);
	store.setStatus("speaking");
	store.setProgress(null);
	setStageProgress(4);
	try {
		assertNotCancelled(signal);
		const clips = await generateSegmentClips({
			segments: timedSegments,
			speakerVoices: voices,
			defaultVoice,
			signal,
		});
		assertNotCancelled(signal);
		store.setStatus("applying");
		store.setProgress(null);
		setStageProgress(92);
		await applySegmentedDubToTimeline({
			editor,
			clips,
			namePrefix: `dub-${store.targetLang.toLowerCase()}`,
		});
		assertNotCancelled(signal);
		await applySegmentsAsTextElements({
			editor,
			segments: timedSegments,
			targetLanguage: store.targetLang,
		});
		setStageProgress(100);
		store.setStatus("done");
	} catch (error) {
		if (error instanceof DubCancelledError || signal?.aborted) {
			throw new DubCancelledError();
		}
		store.setError(
			error instanceof Error ? error.message : "Speech synthesis failed",
		);
		throw error;
	} finally {
		useDubbingStore.getState().setProgress(null);
	}
}

export async function runFullDub({
	editor,
	asset,
	signal,
}: {
	editor: EditorCore;
	asset: MediaAsset;
	signal?: AbortSignal;
}): Promise<void> {
	await runTranscription({ asset, signal });
	assertNotCancelled(signal);
	await runTranslation({ signal });
	assertNotCancelled(signal);
	await runSpeechAndApply({ editor, signal });
}
