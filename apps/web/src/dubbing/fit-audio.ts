import { PitchShifter } from "soundtouchjs";

/**
 * Speed-fit TTS clips into their transcript segment slots: when a synthesized
 * line runs longer than its beat window, time-stretch it (pitch preserved)
 * instead of trimming speech mid-sentence. Speed-up is capped so lines stay
 * intelligible; any residual overflow is still trimmed by the timeline layout.
 */

const TTS_SAMPLE_RATE = 24000;
/** Beyond this speed-up the voice sounds rushed — trim handles the rest. */
const MAX_SPEEDUP = 1.8;
/** Ignore overruns below 3% — not worth a render pass. */
const MIN_OVERRUN_RATIO = 1.03;

function base64ToPcmFloat32(base64: string): Float32Array {
	const binary = atob(base64);
	const sampleCount = Math.floor(binary.length / 2);
	const samples = new Float32Array(sampleCount);
	for (let i = 0; i < sampleCount; i++) {
		const low = binary.charCodeAt(i * 2);
		const high = binary.charCodeAt(i * 2 + 1);
		let value = (high << 8) | low;
		if (value >= 0x8000) value -= 0x10000;
		samples[i] = value / 0x8000;
	}
	return samples;
}

function pcmFloat32ToBase64(samples: Float32Array): string {
	const bytes = new Uint8Array(samples.length * 2);
	const view = new DataView(bytes.buffer);
	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(
			i * 2,
			clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
			true,
		);
	}
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

export function pcmBase64DurationSeconds(
	base64: string,
	sampleRate = TTS_SAMPLE_RATE,
): number {
	// base64 → byte length without decoding: 3 bytes per 4 chars, minus padding.
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	const byteLength = (base64.length / 4) * 3 - padding;
	return byteLength / 2 / sampleRate;
}

async function stretchPcm({
	samples,
	tempo,
	sampleRate,
}: {
	samples: Float32Array;
	tempo: number;
	sampleRate: number;
}): Promise<Float32Array> {
	const outputSamples = Math.max(1, Math.ceil(samples.length / tempo));
	const ctx = new OfflineAudioContext(1, outputSamples, sampleRate);
	const buffer = ctx.createBuffer(1, samples.length, sampleRate);
	buffer.copyToChannel(samples, 0);

	const shifter = new PitchShifter(ctx, buffer, 4096);
	shifter.tempo = tempo;
	shifter.pitch = 1;
	shifter.connect(ctx.destination);

	const rendered = await ctx.startRendering();
	return rendered.getChannelData(0);
}

export interface FitResult {
	base64: string;
	/** Applied speed-up factor (1 = untouched). */
	tempo: number;
	durationSeconds: number;
}

/**
 * Speed up a PCM clip so it fits `targetSeconds`. Returns the original
 * audio when it already fits or the overrun is negligible.
 */
export async function fitPcmToDuration({
	base64,
	targetSeconds,
	sampleRate = TTS_SAMPLE_RATE,
}: {
	base64: string;
	targetSeconds: number;
	sampleRate?: number;
}): Promise<FitResult> {
	const sourceSeconds = pcmBase64DurationSeconds(base64, sampleRate);
	if (
		targetSeconds <= 0 ||
		sourceSeconds <= 0 ||
		sourceSeconds / targetSeconds < MIN_OVERRUN_RATIO
	) {
		return { base64, tempo: 1, durationSeconds: sourceSeconds };
	}

	const tempo = Math.min(sourceSeconds / targetSeconds, MAX_SPEEDUP);
	try {
		const stretched = await stretchPcm({
			samples: base64ToPcmFloat32(base64),
			tempo,
			sampleRate,
		});
		return {
			base64: pcmFloat32ToBase64(stretched),
			tempo,
			durationSeconds: stretched.length / sampleRate,
		};
	} catch (error) {
		console.warn("Speed-fit failed, keeping original audio:", error);
		return { base64, tempo: 1, durationSeconds: sourceSeconds };
	}
}
