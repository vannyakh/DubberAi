import {
	transcribeVideo,
	translateText,
	generateSpeech,
	detectVocalStyles,
} from "@/services/ai-client";
import { parseSegments, fileToBase64, VOICES } from "@dubbercut/utils";
import { extractAudioForTranscription } from "./extract-audio";
import type { Segment, SpeakerVocalProfile } from "@dubbercut/types";
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

function getStore() {
	return useDubbingStore.getState();
}

function normalizeStageError(
	error: unknown,
	fallbackMessage: string,
): Error | DubCancelledError {
	if (error instanceof DubCancelledError) return error;
	if (error instanceof Error) return error;
	return new Error(fallbackMessage);
}

function handleStageFailure({
	error,
	signal,
	fallbackMessage,
}: {
	error: unknown;
	signal?: AbortSignal;
	fallbackMessage: string;
}): never {
	if (error instanceof DubCancelledError || signal?.aborted) {
		throw new DubCancelledError();
	}
	const normalized = normalizeStageError(error, fallbackMessage);
	getStore().setError(normalized.message);
	throw normalized;
}

async function runStage<T>({
	status,
	initialPercent,
	fallbackMessage,
	signal,
	run,
}: {
	status: "transcribing" | "translating" | "speaking" | "applying";
	initialPercent: number;
	fallbackMessage: string;
	signal?: AbortSignal;
	run: () => Promise<T>;
}): Promise<T> {
	const store = getStore();
	store.setError(null);
	store.setStatus(status);
	setStageProgress(initialPercent);
	try {
		assertNotCancelled(signal);
		return await run();
	} catch (error) {
		handleStageFailure({ error, signal, fallbackMessage });
	}
}

async function withProgressTicker<T>({
	untilPercent,
	step = 2,
	intervalMs = 450,
	run,
}: {
	untilPercent: number;
	step?: number;
	intervalMs?: number;
	run: () => Promise<T>;
}): Promise<T> {
	const timer = window.setInterval(() => {
		const current = getStore().overlayPercent;
		if (current < untilPercent) {
			getStore().setOverlayPercent(current + step);
		}
	}, intervalMs);
	try {
		return await run();
	} finally {
		window.clearInterval(timer);
	}
}

function voiceForGenderProfile({
	gender,
	index,
	defaultVoice,
}: {
	gender: SpeakerVocalProfile["gender"];
	index: number;
	defaultVoice: string;
}): string {
	const pool =
		gender === "female"
			? VOICES.filter((voice) => voice.gender === "female")
			: gender === "male"
				? VOICES.filter((voice) => voice.gender === "male")
				: VOICES;
	return pool[index % pool.length]?.id ?? defaultVoice;
}

/** Cast voices from detected gender; keep any user overrides. */
function ensureSpeakerVoices(
	segments: Segment[],
	profiles: Record<string, SpeakerVocalProfile> = {},
): void {
	const store = useDubbingStore.getState();
	const { speakerVoices, defaultVoice, speakerProfiles } = store;
	const speakers = [
		...new Set(segments.map((segment) => segment.speaker || "Speaker")),
	];
	const genderCounts: Record<string, number> = {
		female: 0,
		male: 0,
		neutral: 0,
	};

	speakers.forEach((speaker) => {
		if (speakerVoices[speaker]) return;
		const profile = profiles[speaker] ?? speakerProfiles[speaker];
		const gender = profile?.gender ?? "neutral";
		const preferred = voiceForGenderProfile({
			gender,
			index: genderCounts[gender] ?? 0,
			defaultVoice,
		});
		genderCounts[gender] = (genderCounts[gender] ?? 0) + 1;
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

function speechStyleForSegment({
	segment,
	speakerProfiles,
}: {
	segment: Segment;
	speakerProfiles: Record<string, SpeakerVocalProfile>;
}) {
	const profile = speakerProfiles[segment.speaker || "Speaker"];
	return {
		feeling: segment.feeling ?? profile?.defaultFeeling ?? "neutral",
		intensity: segment.intensity ?? "medium",
		delivery: segment.delivery,
		persona: profile?.persona,
	};
}

function mergeStylesOntoTranslation({
	translationSegments,
	transcriptSegments,
}: {
	translationSegments: Segment[];
	transcriptSegments: Segment[];
}): Segment[] {
	return translationSegments.map((segment, index) => {
		const source =
			transcriptSegments[index] ??
			transcriptSegments.find(
				(candidate) =>
					candidate.speaker === segment.speaker &&
					Math.abs(candidate.time - segment.time) < 0.6,
			);
		if (!source) return segment;
		return {
			...segment,
			feeling: segment.feeling ?? source.feeling,
			intensity: segment.intensity ?? source.intensity,
			delivery: segment.delivery ?? source.delivery,
		};
	});
}

async function detectAndApplyVocalStyles({
	transcript,
	segments,
	signal,
}: {
	transcript: string;
	segments: Segment[];
	signal?: AbortSignal;
}): Promise<Segment[]> {
	assertNotCancelled(signal);
	const result = await detectVocalStyles({
		transcript,
		segments: segments.map((segment) => ({
			time: segment.time,
			speaker: segment.speaker,
			text: segment.text,
			raw: segment.raw,
		})),
	});
	assertNotCancelled(signal);

	const profiles: SpeakerVocalProfile[] = result.speakers.map((speaker) => ({
		speaker: speaker.speaker,
		gender: speaker.gender,
		defaultFeeling: speaker.defaultFeeling,
		persona: speaker.persona,
	}));
	getStore().setSpeakerProfiles(profiles);

	const styled = segments.map((segment, index) => {
		const style = result.segmentStyles[index];
		const profile = profiles.find(
			(entry) => entry.speaker === (segment.speaker || "Speaker"),
		);
		return {
			...segment,
			feeling: style?.feeling ?? profile?.defaultFeeling ?? "neutral",
			intensity: style?.intensity ?? "medium",
			delivery: style?.delivery ?? profile?.persona,
		};
	});

	ensureSpeakerVoices(
		styled,
		Object.fromEntries(profiles.map((profile) => [profile.speaker, profile])),
	);
	return styled;
}

export async function runTranscription({
	asset,
	signal,
}: {
	asset: MediaAsset;
	signal?: AbortSignal;
}): Promise<void> {
	await runStage({
		status: "transcribing",
		initialPercent: 4,
		fallbackMessage: "Transcription failed",
		signal,
		run: async () => {
			const store = getStore();
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
			const result = await withProgressTicker({
				untilPercent: 72,
				run: () => transcribeVideo(payload.base64, payload.mimeType),
			});

			assertNotCancelled(signal);
			setStageProgress(78);

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

			setStageProgress(84);
			const styledSegments = await withProgressTicker({
				untilPercent: 96,
				step: 1,
				intervalMs: 400,
				run: () =>
					detectAndApplyVocalStyles({
						transcript,
						segments,
						signal,
					}),
			});
			store.setTranscription({
				transcript,
				segments: styledSegments,
				detectedLanguage: result?.detectedLanguage ?? null,
			});
			setStageProgress(100);
			store.setStatus("idle");
		},
	});
}

export async function runTranslation({
	signal,
}: {
	signal?: AbortSignal;
} = {}): Promise<void> {
	const store = getStore();
	const { transcript, targetLang, detectedLanguage, transcriptSegments } =
		store;
	if (!transcript) return;
	await runStage({
		status: "translating",
		initialPercent: 8,
		fallbackMessage: "Translation failed",
		signal,
		run: async () => {
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
			const segments = mergeStylesOntoTranslation({
				translationSegments: parseSegments(translated),
				transcriptSegments,
			});
			store.setTranslation({
				text: translated,
				segments,
			});
			ensureSpeakerVoices(segments);
			setStageProgress(100);
			store.setStatus("idle");
		},
	});
}

async function generateSegmentClips({
	segments,
	speakerVoices,
	speakerProfiles,
	defaultVoice,
	signal,
}: {
	segments: Segment[];
	speakerVoices: Record<string, string>;
	speakerProfiles: Record<string, SpeakerVocalProfile>;
	defaultVoice: string;
	signal?: AbortSignal;
}): Promise<DubClip[]> {
	const store = getStore();
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
			const style = speechStyleForSegment({ segment, speakerProfiles });
			const audio = await generateSpeech(segment.text.trim(), voice, style);
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
	const store = getStore();
	const {
		translatedText,
		translationSegments,
		speakerVoices,
		speakerProfiles,
		defaultVoice,
	} = store;
	if (!translatedText) return;
	ensureSpeakerVoices(translationSegments);
	const voices = getStore().speakerVoices;
	const footageEnd = getMainTrackDurationSeconds(editor);
	const timedSegments = ensureSegmentTimeline({
		segments: translationSegments,
		footageEndSeconds: footageEnd,
	});

	try {
		const clips = await runStage({
			status: "speaking",
			initialPercent: 4,
			fallbackMessage: "Speech synthesis failed",
			signal,
			run: async () => {
				store.setProgress(null);
				assertNotCancelled(signal);
				return generateSegmentClips({
					segments: timedSegments,
					speakerVoices: voices,
					speakerProfiles,
					defaultVoice,
					signal,
				});
			},
		});

		await runStage({
			status: "applying",
			initialPercent: 92,
			fallbackMessage: "Applying dubbed clips failed",
			signal,
			run: async () => {
				store.setProgress(null);
				assertNotCancelled(signal);
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
			},
		});
	} finally {
		getStore().setProgress(null);
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
