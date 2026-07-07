import type { EditorCore } from "@/core";
import { decodeAudioToFloat32 } from "@/media/audio";
import { detectSilences } from "./silence";
import { applyCutsToElement, type ApplyCutsResult } from "./apply-cuts";
import { useAutoCutStore } from "./autocut-store";

/**
 * Decode the target element's source media and detect silences with the
 * current options. Results land in the autocut store for preview.
 */
export async function runSilenceDetection({
	editor,
}: {
	editor: EditorCore;
}): Promise<void> {
	const store = useAutoCutStore.getState();
	const { target, options } = store;
	if (!target) return;

	const track = editor.timeline.getTrackById({ trackId: target.trackId });
	const element = track?.elements.find((el) => el.id === target.elementId);
	if (!element || !("mediaId" in element)) {
		store.setError("Select a video or audio clip first");
		return;
	}

	const asset = editor.media
		.getAssets()
		.find((mediaAsset) => mediaAsset.id === element.mediaId);
	if (!asset) {
		store.setError("Source media for this clip was not found");
		return;
	}

	store.setError(null);
	store.setStatus("analyzing");
	try {
		const { samples, sampleRate } = await decodeAudioToFloat32({
			audioBlob: asset.file,
		});
		const silences = detectSilences({ samples, sampleRate, options });
		store.setDetection({
			silences,
			analyzedDurationSeconds: samples.length / sampleRate,
		});
		store.setStatus("idle");
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Audio analysis failed",
		);
		throw error;
	}
}

/** Apply the detected silences as cuts on the timeline (single undo step). */
export function runApplyCuts({
	editor,
}: {
	editor: EditorCore;
}): ApplyCutsResult | null {
	const store = useAutoCutStore.getState();
	const { target, silences } = store;
	if (!target || silences.length === 0) return null;

	store.setError(null);
	store.setStatus("applying");
	try {
		const result = applyCutsToElement({ editor, target, silences });
		store.setStatus("done");
		return result;
	} catch (error) {
		store.setError(
			error instanceof Error ? error.message : "Applying cuts failed",
		);
		throw error;
	}
}
