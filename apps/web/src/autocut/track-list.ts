import type { EditorCore } from "@/core";
import type { TimelineElement } from "@/timeline";
import type { AutoCutTrackCategory } from "./config";
import { listCuttableElements, type CuttableElementRef } from "./apply-cuts";

export interface CuttableClipItem {
	key: string;
	trackId: string;
	elementId: string;
	element: TimelineElement;
	category: AutoCutTrackCategory;
	trackLabel: string;
}

const CATEGORY_LABELS: Record<AutoCutTrackCategory, string> = {
	main: "Master track",
	overlay: "Overlay",
	audio: "Sounds / audio",
};

export function categoryLabel(category: AutoCutTrackCategory): string {
	return CATEGORY_LABELS[category];
}

export function listCuttableClips({
	editor,
}: {
	editor: EditorCore;
}): CuttableClipItem[] {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return [];

	const mainTrackId = scene.tracks.main.id;
	const overlayIds = new Set(scene.tracks.overlay.map((track) => track.id));
	const audioIds = new Set(scene.tracks.audio.map((track) => track.id));

	return listCuttableElements({ editor }).map((item) => {
		let category: AutoCutTrackCategory = "overlay";
		let trackLabel = "Overlay";

		if (item.trackId === mainTrackId) {
			category = "main";
			trackLabel = scene.tracks.main.name || "Master";
		} else if (audioIds.has(item.trackId)) {
			category = "audio";
			const track = scene.tracks.audio.find((t) => t.id === item.trackId);
			trackLabel = track?.name || "Audio";
		} else if (overlayIds.has(item.trackId)) {
			const track = scene.tracks.overlay.find((t) => t.id === item.trackId);
			trackLabel = track?.name || "Overlay";
		}

		return {
			key: `${item.trackId}:${item.element.id}`,
			trackId: item.trackId,
			elementId: item.element.id,
			element: item.element,
			category,
			trackLabel,
		};
	});
}

export function groupClipsByCategory(
	clips: CuttableClipItem[],
): Record<AutoCutTrackCategory, CuttableClipItem[]> {
	return {
		main: clips.filter((clip) => clip.category === "main"),
		overlay: clips.filter((clip) => clip.category === "overlay"),
		audio: clips.filter((clip) => clip.category === "audio"),
	};
}

export function filterEnabledClips({
	clips,
	enabledKeys,
	pipeline,
}: {
	clips: CuttableClipItem[];
	enabledKeys: Record<string, boolean>;
	pipeline: {
		cutMainTrack: boolean;
		cutAudioTracks: boolean;
		cutOverlayTracks: boolean;
	};
}): CuttableClipItem[] {
	return clips.filter((clip) => {
		if (!enabledKeys[clip.key]) return false;
		if (clip.category === "main" && !pipeline.cutMainTrack) return false;
		if (clip.category === "audio" && !pipeline.cutAudioTracks) return false;
		if (clip.category === "overlay" && !pipeline.cutOverlayTracks) return false;
		return true;
	});
}

export function toCuttableRef(clip: CuttableClipItem): CuttableElementRef {
	return { trackId: clip.trackId, elementId: clip.elementId };
}
