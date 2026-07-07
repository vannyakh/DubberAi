import type { Segment } from "@dubbercute/types";
import type { EditorCore } from "@/core";
import { BatchCommand, type Command } from "@/commands";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { buildElementFromMedia, buildTextElement } from "@/timeline/element-utils";
import { processMediaAssets } from "@/media/processing";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	roundMediaTime,
	type MediaTime,
} from "@/wasm";

const TTS_SAMPLE_RATE = 24000;
const DEFAULT_SEGMENT_SECONDS = 3;

/**
 * Gemini TTS returns raw 16-bit mono PCM at 24 kHz; wrap it in a WAV
 * container so it can flow through the normal media import pipeline.
 */
export function pcmBase64ToWavFile({
	base64,
	name,
	sampleRate = TTS_SAMPLE_RATE,
}: {
	base64: string;
	name: string;
	sampleRate?: number;
}): File {
	const binary = atob(base64);
	const pcm = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		pcm[i] = binary.charCodeAt(i);
	}

	const header = new ArrayBuffer(44);
	const view = new DataView(header);
	const writeString = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i++) {
			view.setUint8(offset + i, value.charCodeAt(i));
		}
	};

	const numChannels = 1;
	const bytesPerSample = 2;
	const byteRate = sampleRate * numChannels * bytesPerSample;

	writeString(0, "RIFF");
	view.setUint32(4, 36 + pcm.length, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, numChannels * bytesPerSample, true);
	view.setUint16(34, 16, true);
	writeString(36, "data");
	view.setUint32(40, pcm.length, true);

	return new File([header, pcm], name, { type: "audio/wav" });
}

function segmentDuration({
	segments,
	index,
}: {
	segments: Segment[];
	index: number;
}): number {
	const current = segments[index];
	const next = segments[index + 1];
	if (next && next.time > current.time) {
		return next.time - current.time;
	}
	return DEFAULT_SEGMENT_SECONDS;
}

/**
 * Insert translated transcript segments as text elements on a text track.
 * Returns the command so callers can batch it; execution is one undo step.
 */
export function applySegmentsAsTextElements({
	editor,
	segments,
}: {
	editor: EditorCore;
	segments: Segment[];
}): void {
	if (segments.length === 0) return;

	const commands: Command[] = segments.map((segment, index) => {
		const element = buildTextElement({
			raw: {
				content: segment.text,
				duration: mediaTimeFromSeconds({
					seconds: segmentDuration({ segments, index }),
				}),
			},
			startTime: mediaTimeFromSeconds({ seconds: segment.time }),
		});
		return new InsertElementCommand({
			element,
			placement: { mode: "auto", trackType: "text" },
		});
	});

	editor.command.execute({ command: new BatchCommand(commands) });
}

export interface DubClip {
	segment: Segment;
	audioBase64: string;
}

/**
 * Import one TTS clip per transcript segment and lay them out on an audio
 * track as a dubbed voiceover over the footage: each clip starts at its
 * segment timestamp and is trimmed so it never overruns the next segment's
 * beat window. Committed as a single undo step.
 */
export async function applySegmentedDubToTimeline({
	editor,
	clips,
	namePrefix,
}: {
	editor: EditorCore;
	clips: DubClip[];
	namePrefix: string;
}): Promise<void> {
	if (clips.length === 0) return;

	const project = editor.project.getActive();
	const footageEnd = getMainTrackDurationSeconds(editor);
	const segments = clips.map((clip) => clip.segment);

	const files = clips.map((clip, index) =>
		pcmBase64ToWavFile({
			base64: clip.audioBase64,
			name: `${namePrefix}-${String(index + 1).padStart(2, "0")}-${clip.segment.speaker || "voice"}.wav`,
		}),
	);
	const processed = await processMediaAssets({ files });
	if (processed.length !== clips.length) {
		throw new Error("Failed to process generated dub audio clips");
	}

	const commands: Command[] = [];
	for (let index = 0; index < clips.length; index++) {
		const { segment } = clips[index];
		const asset = processed[index];
		const addMediaCmd = new AddMediaAssetCommand(project.metadata.id, asset);
		commands.push(addMediaCmd);

		const sourceSeconds = asset.duration ?? DEFAULT_SEGMENT_SECONDS;
		// Beat window: from this segment's timestamp to the next one
		// (or to the end of the footage for the last segment).
		const nextTime = segments[index + 1]?.time;
		const slotSeconds =
			nextTime !== undefined && nextTime > segment.time
				? nextTime - segment.time
				: footageEnd > segment.time
					? footageEnd - segment.time
					: sourceSeconds;
		const visibleSeconds = Math.min(sourceSeconds, slotSeconds);

		const sourceDuration = mediaTimeFromSeconds({ seconds: sourceSeconds });
		const element = buildElementFromMedia({
			mediaId: addMediaCmd.getAssetId(),
			mediaType: "audio",
			name: asset.name,
			duration: sourceDuration,
			startTime: mediaTimeFromSeconds({ seconds: segment.time }),
		});
		if (visibleSeconds < sourceSeconds) {
			element.duration = roundMediaTime({
				time: mediaTimeFromSeconds({ seconds: visibleSeconds }),
			});
			element.trimEnd = roundMediaTime({
				time: ((sourceDuration as number) -
					(element.duration as number)) as MediaTime,
			});
		}

		commands.push(
			new InsertElementCommand({
				element,
				placement: { mode: "auto", trackType: "audio" },
			}),
		);
	}

	editor.command.execute({ command: new BatchCommand(commands) });
}

/**
 * Import a TTS audio buffer (base64 PCM) as a media asset and insert it
 * on an audio track at the given start time, as a single undo step.
 */
export async function applyTtsAudioToTimeline({
	editor,
	audioBase64,
	name,
	startTimeSeconds = 0,
}: {
	editor: EditorCore;
	audioBase64: string;
	name: string;
	startTimeSeconds?: number;
}): Promise<void> {
	const project = editor.project.getActive();
	const file = pcmBase64ToWavFile({ base64: audioBase64, name });
	const [processed] = await processMediaAssets({ files: [file] });
	if (!processed) {
		throw new Error("Failed to process generated dub audio");
	}

	const addMediaCmd = new AddMediaAssetCommand(project.metadata.id, processed);
	const duration: MediaTime = mediaTimeFromSeconds({
		seconds: processed.duration ?? 1,
	});
	const element = buildElementFromMedia({
		mediaId: addMediaCmd.getAssetId(),
		mediaType: "audio",
		name: processed.name,
		duration,
		startTime: mediaTimeFromSeconds({ seconds: startTimeSeconds }),
	});

	editor.command.execute({
		command: new BatchCommand([
			addMediaCmd,
			new InsertElementCommand({
				element,
				placement: { mode: "auto", trackType: "audio" },
			}),
		]),
	});
}

export function getMainTrackDurationSeconds(editor: EditorCore): number {
	const scene = editor.scenes.getActiveScene();
	let end = 0;
	for (const element of scene.tracks.main.elements) {
		const elementEnd =
			mediaTimeToSeconds({ time: element.startTime }) +
			mediaTimeToSeconds({ time: element.duration });
		end = Math.max(end, elementEnd);
	}
	return end;
}
