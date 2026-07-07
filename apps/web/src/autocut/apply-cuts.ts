/**
 * Applies detected silences to the timeline: the target element is replaced
 * by its non-silent segments and everything after it ripples left to close
 * the gaps. Committed as a single undoable TracksSnapshotCommand.
 */

import type { SceneTracks, TimelineElement, TimelineTrack } from "@/timeline";
import { EditorCore } from "@/core";
import { TracksSnapshotCommand } from "@/commands/timeline/tracks-snapshot";
import { generateUUID } from "@/utils/id";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	roundMediaTime,
	TICKS_PER_SECOND,
	type MediaTime,
} from "@/wasm";
import type { SilenceRange } from "./silence";

/** Kept clip pieces shorter than this are dropped entirely. */
const MIN_KEEP_SECONDS = 0.05;

export interface CuttableElementRef {
	trackId: string;
	elementId: string;
}

interface ClipRange {
	start: number;
	end: number;
}

function isCuttableElement(element: TimelineElement): boolean {
	if (element.type !== "video" && element.type !== "audio") return false;
	const rate =
		"retime" in element && element.retime ? element.retime.rate : 1;
	return rate === 1;
}

/**
 * Complement of the silences inside the element's visible clip window,
 * in clip-relative ticks (0..duration).
 */
function computeKeptClipRanges({
	element,
	silences,
}: {
	element: TimelineElement;
	silences: SilenceRange[];
}): ClipRange[] {
	const duration = element.duration as number;
	const trimStart = element.trimStart as number;

	const clipSilences: ClipRange[] = [];
	for (const silence of silences) {
		const start = Math.max(
			0,
			(mediaTimeFromSeconds({ seconds: silence.startSeconds }) as number) -
				trimStart,
		);
		const end = Math.min(
			duration,
			(mediaTimeFromSeconds({ seconds: silence.endSeconds }) as number) -
				trimStart,
		);
		if (end > start) {
			clipSilences.push({ start, end });
		}
	}
	clipSilences.sort((a, b) => a.start - b.start);

	const minKeepTicks = MIN_KEEP_SECONDS * TICKS_PER_SECOND;
	const kept: ClipRange[] = [];
	let cursor = 0;
	for (const silence of clipSilences) {
		if (silence.start - cursor >= minKeepTicks) {
			kept.push({ start: cursor, end: silence.start });
		}
		cursor = Math.max(cursor, silence.end);
	}
	if (duration - cursor >= minKeepTicks) {
		kept.push({ start: cursor, end: duration });
	}
	return kept;
}

function buildSegmentElements({
	element,
	keptRanges,
}: {
	element: TimelineElement;
	keptRanges: ClipRange[];
}): TimelineElement[] {
	const segments: TimelineElement[] = [];
	let sceneCursor = element.startTime as number;

	for (const range of keptRanges) {
		const length = range.end - range.start;
		segments.push({
			...element,
			id: generateUUID(),
			startTime: roundMediaTime({ time: sceneCursor }),
			duration: roundMediaTime({ time: length }),
			trimStart: roundMediaTime({
				time: (element.trimStart as number) + range.start,
			}),
			trimEnd: roundMediaTime({
				time:
					(element.trimEnd as number) +
					((element.duration as number) - range.end),
			}),
			// Keyframes would need re-anchoring across cuts; drop them instead
			// of silently corrupting their timing.
			animations: undefined,
		});
		sceneCursor += length;
	}

	return segments;
}

function mapTrack<TTrack extends TimelineTrack>({
	track,
	targetTrackId,
	targetElementId,
	segments,
	rippleAfter,
	removedTicks,
}: {
	track: TTrack;
	targetTrackId: string;
	targetElementId: string;
	segments: TimelineElement[];
	rippleAfter: number;
	removedTicks: number;
}): TTrack {
	const elements = track.elements.flatMap((element): TimelineElement[] => {
		if (track.id === targetTrackId && element.id === targetElementId) {
			return segments;
		}
		if ((element.startTime as number) >= rippleAfter && removedTicks > 0) {
			return [
				{
					...element,
					startTime: roundMediaTime({
						time: Math.max(0, (element.startTime as number) - removedTicks),
					}),
				},
			];
		}
		return [element];
	});

	return { ...track, elements } as TTrack;
}

export interface ApplyCutsResult {
	segmentCount: number;
	removedSeconds: number;
}

export function applyCutsToElement({
	editor,
	target,
	silences,
	rippleAllTracks = true,
}: {
	editor: EditorCore;
	target: CuttableElementRef;
	silences: SilenceRange[];
	rippleAllTracks?: boolean;
}): ApplyCutsResult {
	const track = editor.timeline.getTrackById({ trackId: target.trackId });
	const element = track?.elements.find((el) => el.id === target.elementId);
	if (!track || !element) {
		throw new Error("Element to cut was not found on the timeline");
	}
	if (!isCuttableElement(element)) {
		throw new Error(
			"Only video/audio clips without speed changes can be auto-cut",
		);
	}

	const keptRanges = computeKeptClipRanges({ element, silences });
	if (keptRanges.length === 0) {
		throw new Error("Auto-cut would remove the entire clip");
	}

	const keptTicks = keptRanges.reduce(
		(total, range) => total + (range.end - range.start),
		0,
	);
	const removedTicks = (element.duration as number) - keptTicks;
	if (removedTicks <= 0) {
		return { segmentCount: 1, removedSeconds: 0 };
	}

	const segments = buildSegmentElements({ element, keptRanges });
	const rippleAfter =
		(element.startTime as number) + (element.duration as number);

	const before = editor.scenes.getActiveScene().tracks;
	const mapOptions = {
		targetTrackId: target.trackId,
		targetElementId: target.elementId,
		segments,
		rippleAfter,
		removedTicks,
	};
	const after: SceneTracks = {
		overlay: before.overlay.map((overlayTrack) =>
			rippleAllTracks || overlayTrack.id === target.trackId
				? mapTrack({ track: overlayTrack, ...mapOptions })
				: overlayTrack,
		),
		main:
			rippleAllTracks || before.main.id === target.trackId
				? mapTrack({ track: before.main, ...mapOptions })
				: before.main,
		audio: before.audio.map((audioTrack) =>
			rippleAllTracks || audioTrack.id === target.trackId
				? mapTrack({ track: audioTrack, ...mapOptions })
				: audioTrack,
		),
	};

	editor.command.execute({
		command: new TracksSnapshotCommand(before, after),
	});

	return {
		segmentCount: segments.length,
		removedSeconds: mediaTimeToSeconds({
			time: roundMediaTime({ time: removedTicks }),
		}),
	};
}

/** Timeline elements the auto-cut can target (video/audio backed by media). */
export function listCuttableElements({
	editor,
}: {
	editor: EditorCore;
}): Array<{
	trackId: string;
	element: TimelineElement;
	mediaId: string | null;
}> {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return [];

	const tracks: TimelineTrack[] = [
		scene.tracks.main,
		...scene.tracks.overlay,
		...scene.tracks.audio,
	];

	const result: Array<{
		trackId: string;
		element: TimelineElement;
		mediaId: string | null;
	}> = [];
	for (const track of tracks) {
		for (const element of track.elements) {
			if (!isCuttableElement(element)) continue;
			const mediaId =
				"mediaId" in element && typeof element.mediaId === "string"
					? element.mediaId
					: null;
			if (!mediaId) continue;
			result.push({ trackId: track.id, element, mediaId });
		}
	}
	return result;
}

export type { MediaTime };
