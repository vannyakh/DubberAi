import { generateSpeech } from "@/services/ai-client";
import type { Segment } from "@dubbercut/types";
import { pcmBase64ToWavFile } from "./apply-to-timeline";

const previewCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;

function cacheKey({
	text,
	voice,
}: {
	text: string;
	voice: string;
}): string {
	return `${voice}::${text}`;
}

export function stopSegmentPreview(): void {
	if (activeAudio) {
		activeAudio.pause();
		activeAudio.onended = null;
		activeAudio.onerror = null;
		activeAudio = null;
	}
}

export function clearSegmentPreviewCache(): void {
	stopSegmentPreview();
	for (const url of previewCache.values()) {
		URL.revokeObjectURL(url);
	}
	previewCache.clear();
}

async function ensurePreviewObjectUrl({
	segment,
	voice,
}: {
	segment: Segment;
	voice: string;
}): Promise<string> {
	const text = segment.text.trim();
	if (!text) {
		throw new Error("This segment has no spoken text to preview");
	}

	const key = cacheKey({ text, voice });
	const cached = previewCache.get(key);
	if (cached) return cached;

	const pcmBase64 = await generateSpeech(text, voice);
	if (!pcmBase64) {
		throw new Error("Speech synthesis returned no audio");
	}
	const file = pcmBase64ToWavFile({
		base64: pcmBase64,
		name: `preview-${segment.speaker || "voice"}.wav`,
	});
	const objectUrl = URL.createObjectURL(file);
	previewCache.set(key, objectUrl);
	return objectUrl;
}

/**
 * Generate (or reuse cached) TTS for one dialogue line and play it.
 * `onPlaying` fires once playback has started; `onEnded` when it finishes/stops.
 */
export async function previewSegmentSpeech({
	segment,
	voice,
	onPlaying,
	onEnded,
}: {
	segment: Segment;
	voice: string;
	onPlaying?: () => void;
	onEnded?: () => void;
}): Promise<void> {
	stopSegmentPreview();

	const objectUrl = await ensurePreviewObjectUrl({ segment, voice });
	const audio = new Audio(objectUrl);
	activeAudio = audio;

	await new Promise<void>((resolve, reject) => {
		audio.onended = () => {
			if (activeAudio === audio) activeAudio = null;
			onEnded?.();
			resolve();
		};
		audio.onerror = () => {
			if (activeAudio === audio) activeAudio = null;
			onEnded?.();
			reject(new Error("Could not play preview audio"));
		};
		void audio
			.play()
			.then(() => {
				onPlaying?.();
			})
			.catch((error) => {
				if (activeAudio === audio) activeAudio = null;
				onEnded?.();
				reject(
					error instanceof Error
						? error
						: new Error("Preview playback failed"),
				);
			});
	});
}

/** Best matching translation line for a transcript segment (index, then speaker+time). */
export function resolvePreviewSegment({
	transcriptSegment,
	transcriptIndex,
	translationSegments,
}: {
	transcriptSegment: Segment;
	transcriptIndex: number;
	translationSegments: Segment[];
}): Segment | null {
	if (translationSegments.length === 0) return null;
	const byIndex = translationSegments[transcriptIndex];
	if (byIndex) return byIndex;

	const exact = translationSegments.find(
		(segment) =>
			segment.speaker === transcriptSegment.speaker &&
			Math.abs(segment.time - transcriptSegment.time) < 0.6,
	);
	return exact ?? null;
}
