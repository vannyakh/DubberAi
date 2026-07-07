/**
 * Silence detection over decoded PCM. Pure, no editor dependencies:
 * windowed RMS with hysteresis-free thresholding, then merge / filter /
 * pad passes to produce cut-ready ranges in source-media seconds.
 */

export interface SilenceRange {
	/** Seconds from the start of the source media. */
	startSeconds: number;
	endSeconds: number;
}

export interface AutoCutOptions {
	/** Levels below this are treated as silence (dBFS, e.g. -40). */
	thresholdDb: number;
	/** Silences shorter than this are kept (seconds). */
	minSilenceSeconds: number;
	/** Kept on each side of a cut so speech is not clipped (seconds). */
	paddingSeconds: number;
}

export const DEFAULT_AUTOCUT_OPTIONS: AutoCutOptions = {
	thresholdDb: -40,
	minSilenceSeconds: 0.6,
	paddingSeconds: 0.08,
};

const WINDOW_SECONDS = 0.03;
const HOP_SECONDS = 0.01;

export function detectSilences({
	samples,
	sampleRate,
	options,
}: {
	samples: Float32Array;
	sampleRate: number;
	options: AutoCutOptions;
}): SilenceRange[] {
	if (samples.length === 0 || sampleRate <= 0) {
		return [];
	}

	const windowSize = Math.max(1, Math.round(sampleRate * WINDOW_SECONDS));
	const hopSize = Math.max(1, Math.round(sampleRate * HOP_SECONDS));
	const threshold = 10 ** (options.thresholdDb / 20);

	// Mark each analysis window as silent or not.
	const windowCount = Math.max(
		1,
		Math.floor((samples.length - windowSize) / hopSize) + 1,
	);
	const silentWindows = new Uint8Array(windowCount);
	for (let w = 0; w < windowCount; w++) {
		const start = w * hopSize;
		const end = Math.min(start + windowSize, samples.length);
		let sumSquares = 0;
		for (let i = start; i < end; i++) {
			const sample = samples[i];
			sumSquares += sample * sample;
		}
		const rms = Math.sqrt(sumSquares / (end - start));
		silentWindows[w] = rms < threshold ? 1 : 0;
	}

	// Collapse consecutive silent windows into ranges.
	const rawRanges: SilenceRange[] = [];
	let runStart = -1;
	for (let w = 0; w <= windowCount; w++) {
		const isSilent = w < windowCount && silentWindows[w] === 1;
		if (isSilent && runStart === -1) {
			runStart = w;
		} else if (!isSilent && runStart !== -1) {
			rawRanges.push({
				startSeconds: (runStart * hopSize) / sampleRate,
				endSeconds: Math.min(
					((w - 1) * hopSize + windowSize) / sampleRate,
					samples.length / sampleRate,
				),
			});
			runStart = -1;
		}
	}

	// Filter by minimum duration, then shrink by padding on both sides.
	const padded: SilenceRange[] = [];
	for (const range of rawRanges) {
		if (range.endSeconds - range.startSeconds < options.minSilenceSeconds) {
			continue;
		}
		const startSeconds = range.startSeconds + options.paddingSeconds;
		const endSeconds = range.endSeconds - options.paddingSeconds;
		if (endSeconds - startSeconds > 0.01) {
			padded.push({ startSeconds, endSeconds });
		}
	}

	return padded;
}

export function totalSilenceSeconds({
	silences,
}: {
	silences: SilenceRange[];
}): number {
	return silences.reduce(
		(total, range) => total + (range.endSeconds - range.startSeconds),
		0,
	);
}
