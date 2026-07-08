/**
 * Rust/WASM silence detection — offloads RMS windowing from the main JS thread.
 * Falls back to the pure-TS implementation when WASM is unavailable.
 */

import { detectSilences as detectSilencesJs } from "./silence";
import type { AutoCutOptions, SilenceRange } from "./silence";

let wasmDetect:
	| ((options: {
			samples: Float32Array;
			sampleRate: number;
			thresholdDb: number;
			minSilenceSeconds: number;
			paddingSeconds: number;
	  }) => SilenceRange[])
	| null = null;

async function loadWasmDetector(): Promise<typeof wasmDetect> {
	if (wasmDetect) return wasmDetect;
	try {
		const mod = (await import("opencut-wasm")) as Record<string, unknown>;
		const detectFn = mod.detectSilences;
		if (typeof detectFn !== "function") return null;
		wasmDetect = (options) => {
			const ranges = (
				detectFn as (opts: {
					samples: Float32Array;
					sampleRate: number;
					thresholdDb: number;
					minSilenceSeconds: number;
					paddingSeconds: number;
				}) => Array<{ startSeconds: number; endSeconds: number }>
			)({
				samples: options.samples,
				sampleRate: options.sampleRate,
				thresholdDb: options.thresholdDb,
				minSilenceSeconds: options.minSilenceSeconds,
				paddingSeconds: options.paddingSeconds,
			});
			return (ranges ?? []).map((range) => ({
				startSeconds: range.startSeconds,
				endSeconds: range.endSeconds,
			}));
		};
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
