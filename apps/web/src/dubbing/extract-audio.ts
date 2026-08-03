import { decodeAudioToFloat32 } from "@/media/audio";

/**
 * Speech is all the transcriber needs. We decode locally to 16 kHz mono WAV
 * and split into short chunks so the API never receives one huge payload.
 */
const TRANSCRIBE_SAMPLE_RATE = 16000;
const DEFAULT_CHUNK_SECONDS = 30;
const DEFAULT_CONCURRENCY = 3;

function encodeWavFromFloat32({
	samples,
	sampleRate,
}: {
	samples: Float32Array;
	sampleRate: number;
}): Uint8Array {
	const bytesPerSample = 2;
	const dataSize = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	const writeString = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i++) {
			view.setUint8(offset + i, value.charCodeAt(i));
		}
	};

	writeString(0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * bytesPerSample, true);
	view.setUint16(32, bytesPerSample, true);
	view.setUint16(34, 16, true);
	writeString(36, "data");
	view.setUint32(40, dataSize, true);

	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(
			44 + i * bytesPerSample,
			clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
			true,
		);
	}

	return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

export interface ExtractedAudio {
	base64: string;
	mimeType: string;
}

export interface ExtractedAudioChunk extends ExtractedAudio {
	/** Absolute start time of this slice in the source audio. */
	startSeconds: number;
	index: number;
}

export interface ExtractedAudioChunks {
	chunks: ExtractedAudioChunk[];
	sampleRate: number;
	durationSeconds: number;
}

function splitSamplesIntoChunks({
	samples,
	sampleRate,
	chunkSeconds,
}: {
	samples: Float32Array;
	sampleRate: number;
	chunkSeconds: number;
}): ExtractedAudioChunk[] {
	const framesPerChunk = Math.max(1, Math.floor(chunkSeconds * sampleRate));
	const chunks: ExtractedAudioChunk[] = [];

	for (
		let offset = 0, index = 0;
		offset < samples.length;
		offset += framesPerChunk, index++
	) {
		const end = Math.min(offset + framesPerChunk, samples.length);
		const slice = samples.subarray(offset, end);
		const wav = encodeWavFromFloat32({ samples: slice, sampleRate });
		chunks.push({
			index,
			startSeconds: offset / sampleRate,
			base64: bytesToBase64(wav),
			mimeType: "audio/wav",
		});
	}

	return chunks;
}

/**
 * Decode a media file's audio track to a single 16 kHz mono WAV base64.
 * Prefer {@link extractAudioChunksForTranscription} + parallel STT for long media.
 */
export async function extractAudioForTranscription({
	file,
}: {
	file: File;
}): Promise<ExtractedAudio> {
	const { samples, sampleRate } = await decodeAudioToFloat32({
		audioBlob: file,
		sampleRate: TRANSCRIBE_SAMPLE_RATE,
	});
	if (samples.length === 0) {
		throw new Error("The selected video has no audio track to transcribe");
	}
	const wav = encodeWavFromFloat32({ samples, sampleRate });
	return { base64: bytesToBase64(wav), mimeType: "audio/wav" };
}

/**
 * Decode audio and split into ~30s WAV chunks for parallel STT uploads.
 */
export async function extractAudioChunksForTranscription({
	file,
	chunkSeconds = DEFAULT_CHUNK_SECONDS,
}: {
	file: File;
	chunkSeconds?: number;
}): Promise<ExtractedAudioChunks> {
	const { samples, sampleRate } = await decodeAudioToFloat32({
		audioBlob: file,
		sampleRate: TRANSCRIBE_SAMPLE_RATE,
	});
	if (samples.length === 0) {
		throw new Error("The selected video has no audio track to transcribe");
	}

	const chunks = splitSamplesIntoChunks({
		samples,
		sampleRate,
		chunkSeconds,
	});
	return {
		chunks,
		sampleRate,
		durationSeconds: samples.length / sampleRate,
	};
}

export async function mapPool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from(
		{ length: Math.max(1, Math.min(concurrency || DEFAULT_CONCURRENCY, items.length)) },
		async () => {
			while (true) {
				const index = next++;
				if (index >= items.length) return;
				results[index] = await fn(items[index]!, index);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

export { DEFAULT_CHUNK_SECONDS, DEFAULT_CONCURRENCY };
