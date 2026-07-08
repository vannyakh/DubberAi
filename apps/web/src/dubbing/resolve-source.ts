import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/media/types";
import { mediaTimeToSeconds } from "@/wasm";

export interface TimelineVideoSource {
	asset: MediaAsset;
	trackId: string;
	elementId: string;
	startSeconds: number;
	durationSeconds: number;
}

/**
 * Resolve video only from the main scene track (earliest clip).
 */
export function resolveMainTrackVideoSource({
	editor,
}: {
	editor: EditorCore;
}): TimelineVideoSource | null {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return null;

	const assets = editor.media.getAssets();
	const assetById = new Map(assets.map((asset) => [asset.id, asset]));
	const main = scene.tracks.main;

	const candidates: TimelineVideoSource[] = [];
	for (const element of main.elements) {
		if (element.type !== "video") continue;
		const asset = assetById.get(element.mediaId);
		if (!asset || asset.type !== "video") continue;
		candidates.push({
			asset,
			trackId: main.id,
			elementId: element.id,
			startSeconds: mediaTimeToSeconds({ time: element.startTime }),
			durationSeconds: mediaTimeToSeconds({ time: element.duration }),
		});
	}

	if (candidates.length === 0) return null;
	return candidates.sort((a, b) => a.startSeconds - b.startSeconds)[0] ?? null;
}

export function resolveDubSourceAsset({
	editor,
}: {
	editor: EditorCore;
}): MediaAsset | null {
	return resolveMainTrackVideoSource({ editor })?.asset ?? null;
}
