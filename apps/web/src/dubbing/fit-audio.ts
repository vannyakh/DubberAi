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

function base64ToPcmBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function pcmBytesToFloat32(bytes: Uint8Array): Float32Array {
	const sampleCount = Math.floor(bytes.length / 2);
	const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
	const samples = new Float32Array(sampleCount);
	for (let i = 0; i < sampleCount; i++) {
		samples[i] = view.getInt16(i * 2, true) / 0x8000;
	}
	return samples;
}

function float32ToPcmBytes(samples: Float32Array): Uint8Array {
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
	return bytes;
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
	/** Raw 16-bit mono PCM, ready for a WAV wrapper. */
	pcm: Uint8Array;
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
	const pcm = base64ToPcmBytes(base64);
	const sourceSeconds = pcm.length / 2 / sampleRate;
	if (
		targetSeconds <= 0 ||
		sourceSeconds <= 0 ||
		sourceSeconds / targetSeconds < MIN_OVERRUN_RATIO
	) {
		return { pcm, tempo: 1, durationSeconds: sourceSeconds };
	}

	const tempo = Math.min(sourceSeconds / targetSeconds, MAX_SPEEDUP);
	try {
		const stretched = await stretchPcm({
			samples: pcmBytesToFloat32(pcm),
			tempo,
			sampleRate,
		});
		return {
			pcm: float32ToPcmBytes(stretched),
			tempo,
			durationSeconds: stretched.length / sampleRate,
		};
	} catch (error) {
		console.warn("Speed-fit failed, keeping original audio:", error);
		return { pcm, tempo: 1, durationSeconds: sourceSeconds };
	}
}
