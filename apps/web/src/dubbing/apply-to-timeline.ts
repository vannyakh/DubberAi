import type { Segment } from "@dubbercut/types";
import type { EditorCore } from "@/core";
import { BatchCommand, type Command } from "@/commands";
import { AddMediaAssetCommand } from "@/commands/media";
import {
	AddTrackCommand,
	InsertElementCommand,
	UpdateElementsCommand,
} from "@/commands/timeline";
import type { TimelineElement } from "@/timeline";
import { buildElementFromMedia, buildTextElement } from "@/timeline/element-utils";
import { processMediaAssets } from "@/media/processing";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	roundMediaTime,
	type MediaTime,
} from "@/wasm";
import { DEFAULT_TARGET_LANGUAGE } from "@dubbercut/utils";
import {
	ensureFontsForTexts,
	resolveGoogleFontForText,
} from "@/fonts/language-fonts";

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
	footageEndSeconds,
}: {
	segments: Segment[];
	index: number;
	footageEndSeconds?: number;
}): number {
	const current = segments[index];
	const next = segments[index + 1];
	if (current.end != null && current.end > current.time) {
		return Math.max(0.4, current.end - current.time);
	}
	if (next && next.time > current.time) {
		return Math.max(0.4, next.time - current.time);
	}
	if (
		footageEndSeconds !== undefined &&
		footageEndSeconds > current.time
	) {
		return Math.max(0.4, footageEndSeconds - current.time);
	}
	const estimated = Math.max(1.2, Math.min(12, current.text.length / 12));
	const pausePad =
		(current.pauseBeforeSeconds ?? 0) +
		(current.pauseAfterSeconds ?? 0) +
		(current.inlinePauses?.reduce((sum, value) => sum + value, 0) ?? 0);
	return estimated + pausePad;
}

/**
 * Trim vocal to the spoken window only (exclude trailing pause after dialogue
 * so next speaker/captions stay aligned to transcript markers).
 */
function spokenTrimSeconds({
	segment,
	slotSeconds,
	sourceSeconds,
}: {
	segment: Segment;
	slotSeconds: number;
	sourceSeconds: number;
}): number {
	const trailingPause = Math.min(
		segment.pauseAfterSeconds ?? 0,
		Math.max(0, slotSeconds - 0.4),
	);
	const spokenSlot = Math.max(0.4, slotSeconds - trailingPause);
	return Math.min(sourceSeconds, spokenSlot);
}

function uniqueSpeakers(segments: Segment[]): string[] {
	const names: string[] = [];
	const seen = new Set<string>();
	for (const segment of segments) {
		const speaker = segment.speaker || "Speaker";
		if (seen.has(speaker)) continue;
		seen.add(speaker);
		names.push(speaker);
	}
	return names;
}

/**
 * When Whisper returns lines without real timestamps, space them along the
 * timeline so each caption/voice clip still gets its own beat window.
 * Honors `(...Ns)` pause markers between lines.
 */
export function ensureSegmentTimeline({
	segments,
	footageEndSeconds,
}: {
	segments: Segment[];
	footageEndSeconds?: number;
}): Segment[] {
	if (segments.length === 0) return segments;
	const hasDistinctTimes = segments.some(
		(segment, index) => index > 0 && segment.time > segments[0].time,
	);
	if (hasDistinctTimes) {
		return segments.map((segment, index) => {
			const next = segments[index + 1];
			const end =
				segment.end ??
				(next && next.time > segment.time
					? next.time
					: segment.time +
						segmentDuration({
							segments,
							index,
							footageEndSeconds,
						}));
			return {
				...segment,
				speaker: segment.speaker || "Speaker 1",
				end,
			};
		});
	}

	let cursor = segments[0]?.time ?? 0;
	return segments.map((segment, index) => {
		const duration = segmentDuration({
			segments,
			index,
			footageEndSeconds,
		});
		const next: Segment = {
			...segment,
			time: cursor,
			end: cursor + duration,
			speaker: segment.speaker || "Speaker 1",
		};
		cursor += duration;
		return next;
	});
}

/**
 * Insert translated transcript segments as text elements on a dedicated
 * captions text track, downloading fonts for the target language first.
 */
export async function applySegmentsAsTextElements({
	editor,
	segments,
	targetLanguage = DEFAULT_TARGET_LANGUAGE,
}: {
	editor: EditorCore;
	segments: Segment[];
	targetLanguage?: string;
}): Promise<void> {
	if (segments.length === 0) return;

	const footageEnd = getMainTrackDurationSeconds(editor);
	const timedSegments = ensureSegmentTimeline({
		segments,
		footageEndSeconds: footageEnd,
	});

	await ensureFontsForTexts({
		texts: timedSegments.map((segment) => segment.text),
		targetLanguage,
	});

	const addTrackCmd = new AddTrackCommand("text", 0, "Dub captions");
	const trackId = addTrackCmd.getTrackId();
	const commands: Command[] = [
		addTrackCmd,
		...timedSegments.map((segment, index) => {
			const fontFamily = resolveGoogleFontForText({
				text: segment.text,
				targetLanguage,
			});
			const element = buildTextElement({
				raw: {
					content: segment.text,
					fontFamily,
					duration: mediaTimeFromSeconds({
						seconds: segmentDuration({
							segments: timedSegments,
							index,
							footageEndSeconds: footageEnd,
						}),
					}),
				},
				startTime: mediaTimeFromSeconds({ seconds: segment.time }),
			});
			return new InsertElementCommand({
				element,
				placement: { mode: "explicit", trackId },
			});
		}),
	];

	editor.command.execute({ command: new BatchCommand(commands) });
}

export interface DubClip {
	segment: Segment;
	audioBase64: string;
}

/**
 * Import one TTS clip per transcript segment and lay them on dedicated
 * per-speaker audio tracks: each clip starts at its segment timestamp and
 * is trimmed so it never overruns the next segment's beat window.
 */
export async function applySegmentedDubToTimeline({
	editor,
	clips,
	namePrefix,
	muteSourceVideo = true,
}: {
	editor: EditorCore;
	clips: DubClip[];
	namePrefix: string;
	muteSourceVideo?: boolean;
}): Promise<void> {
	if (clips.length === 0) return;

	const project = editor.project.getActive();
	const footageEnd = getMainTrackDurationSeconds(editor);
	const segments = ensureSegmentTimeline({
		segments: clips.map((clip) => clip.segment),
		footageEndSeconds: footageEnd,
	});
	const speakers = uniqueSpeakers(segments);

	const files = clips.map((clip, index) =>
		pcmBase64ToWavFile({
			base64: clip.audioBase64,
			name: `${namePrefix}-${String(index + 1).padStart(2, "0")}-${segments[index]?.speaker || clip.segment.speaker || "voice"}.wav`,
		}),
	);
	const processed = await processMediaAssets({ files });
	if (processed.length !== clips.length) {
		throw new Error("Failed to process generated dub audio clips");
	}

	const commands: Command[] = [];
	const speakerTrackIds = new Map<string, string>();

	for (const speaker of speakers) {
		const addTrackCmd = new AddTrackCommand(
			"audio",
			undefined,
			`Dub · ${speaker}`,
		);
		commands.push(addTrackCmd);
		speakerTrackIds.set(speaker, addTrackCmd.getTrackId());
	}

	for (let index = 0; index < clips.length; index++) {
		const segment = segments[index];
		const asset = processed[index];
		const addMediaCmd = new AddMediaAssetCommand(project.metadata.id, asset);
		commands.push(addMediaCmd);

		const speaker = segment.speaker || "Speaker";
		const trackId = speakerTrackIds.get(speaker);
		if (!trackId) {
			throw new Error(`Missing dub track for speaker ${speaker}`);
		}

		const sourceSeconds = asset.duration ?? DEFAULT_SEGMENT_SECONDS;
		// Match caption beat: mirror the same window used by Dub captions.
		const captionSeconds = segmentDuration({
			segments,
			index,
			footageEndSeconds: footageEnd,
		});
		// Also don't overlap the next line for the same character track.
		const nextSameSpeakerTime = findNextSameSpeakerTime({
			segments,
			index,
			speaker,
		});
		const sameSpeakerSeconds =
			nextSameSpeakerTime !== undefined && nextSameSpeakerTime > segment.time
				? nextSameSpeakerTime - segment.time
				: captionSeconds;
		const slotSeconds = Math.max(
			0.4,
			Math.min(captionSeconds, sameSpeakerSeconds),
		);
		const visibleSeconds = spokenTrimSeconds({
			segment,
			slotSeconds,
			sourceSeconds,
		});
		const startSeconds =
			segment.time + Math.min(segment.pauseBeforeSeconds ?? 0, slotSeconds * 0.5);

		const sourceDuration = mediaTimeFromSeconds({ seconds: sourceSeconds });
		const element = buildElementFromMedia({
			mediaId: addMediaCmd.getAssetId(),
			mediaType: "audio",
			name: asset.name,
			duration: sourceDuration,
			startTime: mediaTimeFromSeconds({ seconds: startSeconds }),
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
				placement: { mode: "explicit", trackId },
			}),
		);
	}

	if (muteSourceVideo) {
		const muteUpdates = collectMuteSourceVideoUpdates(editor);
		if (muteUpdates.length > 0) {
			commands.push(new UpdateElementsCommand({ updates: muteUpdates }));
		}
	}

	editor.command.execute({ command: new BatchCommand(commands) });
}

function findNextSameSpeakerTime({
	segments,
	index,
	speaker,
}: {
	segments: Segment[];
	index: number;
	speaker: string;
}): number | undefined {
	for (let i = index + 1; i < segments.length; i++) {
		if ((segments[i].speaker || "Speaker") === speaker) {
			return segments[i].time;
		}
	}
	return undefined;
}

function collectMuteSourceVideoUpdates(editor: EditorCore): Array<{
	trackId: string;
	elementId: string;
	patch: { muted: true; volume: 0 };
}> {
	const scene = editor.scenes.getActiveScene();
	const updates: Array<{
		trackId: string;
		elementId: string;
		patch: { muted: true; volume: 0 };
	}> = [];

	const consider = (trackId: string, elements: TimelineElement[]) => {
		for (const element of elements) {
			if (element.type !== "video") continue;
			updates.push({
				trackId,
				elementId: element.id,
				patch: { muted: true, volume: 0 },
			});
		}
	};

	consider(scene.tracks.main.id, scene.tracks.main.elements);
	return updates;
}

/**
 * Import a TTS audio buffer (base64 PCM) as a media asset and insert it
 * on a dedicated dub audio track at the given start time.
 */
export async function applyTtsAudioToTimeline({
	editor,
	audioBase64,
	name,
	startTimeSeconds = 0,
	trackName = "Dub · Voice",
	muteSourceVideo = true,
}: {
	editor: EditorCore;
	audioBase64: string;
	name: string;
	startTimeSeconds?: number;
	trackName?: string;
	muteSourceVideo?: boolean;
}): Promise<void> {
	const project = editor.project.getActive();
	const file = pcmBase64ToWavFile({ base64: audioBase64, name });
	const [processed] = await processMediaAssets({ files: [file] });
	if (!processed) {
		throw new Error("Failed to process generated dub audio");
	}

	const addTrackCmd = new AddTrackCommand("audio", undefined, trackName);
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

	const commands: Command[] = [
		addTrackCmd,
		addMediaCmd,
		new InsertElementCommand({
			element,
			placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
		}),
	];

	if (muteSourceVideo) {
		const muteUpdates = collectMuteSourceVideoUpdates(editor);
		if (muteUpdates.length > 0) {
			commands.push(new UpdateElementsCommand({ updates: muteUpdates }));
		}
	}

	editor.command.execute({
		command: new BatchCommand(commands),
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
