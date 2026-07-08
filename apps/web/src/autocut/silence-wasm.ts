/**
 * Rust/WASM silence detection — offloads RMS windowing from the main JS thread.
 * Prefers the direct Float32Array export (cheaper bridge), then the serde options
 * API, then the pure-TS implementation.
 */

import { detectSilences as detectSilencesJs } from "./silence";
import type { AutoCutOptions, SilenceRange } from "./silence";

type WasmSilenceRange = { startSeconds: number; endSeconds: number };

type DetectSilencesF32Fn = (
	samples: Float32Array,
	sampleRate: number,
	thresholdDb: number,
	minSilenceSeconds: number,
	paddingSeconds: number,
) => WasmSilenceRange[];

type DetectSilencesOptionsFn = (opts: {
	samples: Float32Array;
	sampleRate: number;
	thresholdDb: number;
	minSilenceSeconds: number;
	paddingSeconds: number;
}) => WasmSilenceRange[];

let wasmDetect:
	| ((options: {
			samples: Float32Array;
			sampleRate: number;
			thresholdDb: number;
			minSilenceSeconds: number;
			paddingSeconds: number;
	  }) => SilenceRange[])
	| null = null;

function mapRanges(ranges: WasmSilenceRange[] | null | undefined): SilenceRange[] {
	return (ranges ?? []).map((range) => ({
		startSeconds: range.startSeconds,
		endSeconds: range.endSeconds,
	}));
}

async function loadWasmDetector(): Promise<typeof wasmDetect> {
	if (wasmDetect) return wasmDetect;
	try {
		const mod = (await import("opencut-wasm")) as Record<string, unknown>;
		const directFn = mod.detectSilencesF32;
		if (typeof directFn === "function") {
			const detectF32 = directFn as DetectSilencesF32Fn;
			wasmDetect = (options) =>
				mapRanges(
					detectF32(
						options.samples,
						options.sampleRate,
						options.thresholdDb,
						options.minSilenceSeconds,
						options.paddingSeconds,
					),
				);
			return wasmDetect;
		}

		const detectFn = mod.detectSilences;
		if (typeof detectFn !== "function") return null;
		const detectOptions = detectFn as DetectSilencesOptionsFn;
		wasmDetect = (options) =>
			mapRanges(
				detectOptions({
					samples: options.samples,
					sampleRate: options.sampleRate,
					thresholdDb: options.thresholdDb,
					minSilenceSeconds: options.minSilenceSeconds,
					paddingSeconds: options.paddingSeconds,
				}),
			);
		return wasmDetect;
	} catch {
		return null;
	}
}

/** Let the overlay paint before blocking work on the main thread. */
export function yieldToUi(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

export async function detectSilencesWithWasm({
	samples,
	sampleRate,
	options,
}: {
	samples: Float32Array;
	sampleRate: number;
	options: AutoCutOptions;
}): Promise<SilenceRange[]> {
	const detector = await loadWasmDetector();
	await yieldToUi();

	if (detector) {
		return detector({
			samples,
			sampleRate,
			thresholdDb: options.thresholdDb,
			minSilenceSeconds: options.minSilenceSeconds,
			paddingSeconds: options.paddingSeconds,
		});
	}

	return detectSilencesJs({ samples, sampleRate, options });
}
