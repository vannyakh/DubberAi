import {
	transcribeVideo,
	translateText,
	generateSpeech,
	generateMultiSpeakerSpeech,
} from "@/services/ai-client";
import { parseSegments, fileToBase64 } from "@video-voice-translator/utils";
import { extractAudioForTranscription } from "./extract-audio";
import type { Segment } from "@video-voice-translator/types";
import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/media/types";
import { useDubbingStore } from "./dubbing-store";
import {
	applySegmentsAsTextElements,
	applySegmentedDubToTimeline,
	applyTtsAudioToTimeline,
	type DubClip,
} from "./apply-to-timeline";

export async function runTranscription({
	asset,
}: {
	asset: MediaAsset;
}): Promise<void> {
	const store = useDubbingStore.getState();
	store.setError(null);
	store.setStatus("transcribing");
	try {
		// Send only the audio track: whole videos routinely exceed the
		// model's inline-data limit and get rejected with "I cannot
		// process video content". Fall back to the raw file when the
		// audio can't be decoded locally.
		let payload: { base64: string; mimeType: string };
		try {
			payload = await extractAudioForTranscription({ file: asset.file });
		} catch (extractError) {
			console.warn(
				"Audio extraction failed, sending original file:",
				extractError,
			);
			payload = {
				base64: await fileToBase64(asset.file),
				mimeType: asset.file.type || "video/mp4",
			};
		}
		const result = await transcribeVideo(payload.base64, payload.mimeType);
		const transcript: string = result?.transcript ?? "";
		if (!transcript) {
			throw new Error("Transcription returned no dialogue");
		}
		if (/^\s*I(?:'m| am)? (?:sorry|cannot|can't)/i.test(transcript)) {
			throw new Error(
				"The AI could not process this file's audio. Try a shorter clip or a different format (mp4/webm).",
			);
		}
		store.setTranscription({
			transcript,
			segments: parseSegments(transcript),
			detectedLanguage: result?.detectedLanguage ?? null,
		});
		store.setStatus("idle");
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Transcription failed",
		);
		throw error;
	}
}

export async function runTranslation(): Promise<void> {
	const store = useDubbingStore.getState();
	const { transcript, targetLang, detectedLanguage } = store;
	if (!transcript) return;
	store.setError(null);
	store.setStatus("translating");
	try {
		const translated =
			(await translateText(
				transcript,
				targetLang,
				detectedLanguage ?? undefined,
			)) ?? "";
		if (!translated) {
			throw new Error("Translation returned no text");
		}
		store.setTranslation({
			text: translated,
			segments: parseSegments(translated),
		});
		store.setStatus("idle");
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Translation failed",
		);
		throw error;
	}
}

/** Segments carry usable timing when at least one has a real timestamp. */
function hasTimingInfo(segments: Segment[]): boolean {
	return segments.some((segment) => segment.time > 0);
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

/**
 * Generate one TTS clip per translated segment (with each character's
 * assigned voice) so clips can be laid out on the timeline at their
 * original beat timestamps.
 */
async function generateSegmentClips({
	segments,
	speakerVoices,
	defaultVoice,
}: {
	segments: Segment[];
	speakerVoices: Record<string, string>;
	defaultVoice: string;
}): Promise<DubClip[]> {
	const store = useDubbingStore.getState();
	const clips: DubClip[] = [];
	for (let index = 0; index < segments.length; index++) {
		const segment = segments[index];
		store.setProgress({ current: index + 1, total: segments.length });
		const voice = voiceForSpeaker({
			speaker: segment.speaker,
			speakerVoices,
			defaultVoice,
		});
		const audio = await generateSpeech(segment.text, voice);
		if (!audio) {
			throw new Error(
				`Speech synthesis returned no audio for segment ${index + 1}`,
			);
		}
		clips.push({ segment, audioBase64: audio });
	}
	return clips;
}

export async function runSpeechAndApply({
	editor,
}: {
	editor: EditorCore;
}): Promise<void> {
	const store = useDubbingStore.getState();
	const { translatedText, translationSegments, speakerVoices, defaultVoice } =
		store;
	if (!translatedText) return;
	store.setError(null);
	store.setStatus("speaking");
	store.setProgress(null);
	try {
		if (hasTimingInfo(translationSegments)) {
			// Per-beat pipeline: one voiceover clip per dialogue segment,
			// placed at the segment's timestamp and trimmed to its window.
			const clips = await generateSegmentClips({
				segments: translationSegments,
				speakerVoices,
				defaultVoice,
			});
			store.setStatus("applying");
			store.setProgress(null);
			await applySegmentedDubToTimeline({
				editor,
				clips,
				namePrefix: `dub-${store.targetLang.toLowerCase()}`,
			});
		} else {
			// No timestamps to align against: fall back to a single
			// multi-speaker (or single-voice) audio bed.
			let audio: string | null = null;
			const voices = { ...speakerVoices };
			for (const segment of translationSegments) {
				voices[segment.speaker] ??= defaultVoice;
			}
			try {
				audio = await generateMultiSpeakerSpeech(translatedText, voices);
			} catch {
				audio = await generateSpeech(translatedText, defaultVoice);
			}
			if (!audio) {
				throw new Error("Speech synthesis returned no audio");
			}
			store.setStatus("applying");
			await applyTtsAudioToTimeline({
				editor,
				audioBase64: audio,
				name: `dub-${store.targetLang.toLowerCase()}.wav`,
				startTimeSeconds: translationSegments[0]?.time ?? 0,
			});
		}

		applySegmentsAsTextElements({ editor, segments: translationSegments });
		store.setStatus("done");
	} catch (error) {
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
}: {
	editor: EditorCore;
	asset: MediaAsset;
}): Promise<void> {
	await runTranscription({ asset });
	await runTranslation();
	await runSpeechAndApply({ editor });
}
