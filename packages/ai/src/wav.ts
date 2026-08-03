/**
 * Minimal PCM WAV helpers for chunked speech-to-text.
 */

export interface WavPcm {
	sampleRate: number;
	channels: number;
	bitsPerSample: number;
	pcm: Uint8Array;
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
	return (
		(bytes[offset]! |
			(bytes[offset + 1]! << 8) |
			(bytes[offset + 2]! << 16) |
			(bytes[offset + 3]! << 24)) >>>
		0
	);
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
	return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function writeString(view: DataView, offset: number, value: string) {
	for (let i = 0; i < value.length; i++) {
		view.setUint8(offset + i, value.charCodeAt(i));
	}
}

/** Parse a PCM WAV buffer. Returns null if the container isn't usable PCM. */
export function parseWavPcm(bytes: Uint8Array): WavPcm | null {
	if (bytes.length < 44) return null;
	const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
	const wave = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
	if (riff !== 'RIFF' || wave !== 'WAVE') return null;

	let sampleRate = 0;
	let channels = 0;
	let bitsPerSample = 0;
	let pcm: Uint8Array | null = null;

	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const chunkId = String.fromCharCode(
			bytes[offset]!,
			bytes[offset + 1]!,
			bytes[offset + 2]!,
			bytes[offset + 3]!,
		);
		const chunkSize = readUint32LE(bytes, offset + 4);
		const dataStart = offset + 8;
		const dataEnd = Math.min(dataStart + chunkSize, bytes.length);

		if (chunkId === 'fmt ' && chunkSize >= 16) {
			channels = readUint16LE(bytes, dataStart + 2);
			sampleRate = readUint32LE(bytes, dataStart + 4);
			bitsPerSample = readUint16LE(bytes, dataStart + 14);
		} else if (chunkId === 'data') {
			pcm = bytes.subarray(dataStart, dataEnd);
		}

		offset = dataStart + chunkSize + (chunkSize % 2);
	}

	if (!pcm || !sampleRate || !channels || !bitsPerSample) return null;
	if (bitsPerSample !== 16) return null;
	return { sampleRate, channels, bitsPerSample, pcm };
}

export function encodeWavPcm({
	pcm,
	sampleRate,
	channels = 1,
	bitsPerSample = 16,
}: {
	pcm: Uint8Array;
	sampleRate: number;
	channels?: number;
	bitsPerSample?: number;
}): Uint8Array {
	const dataSize = pcm.length;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	const bytesPerSample = bitsPerSample / 8;

	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, 'WAVE');
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * bytesPerSample, true);
	view.setUint16(32, channels * bytesPerSample, true);
	view.setUint16(34, bitsPerSample, true);
	writeString(view, 36, 'data');
	view.setUint32(40, dataSize, true);
	new Uint8Array(buffer, 44).set(pcm);
	return new Uint8Array(buffer);
}

export interface AudioChunk {
	/** Complete WAV bytes for this slice. */
	wavBytes: Uint8Array;
	/** Absolute start time of this slice in the source audio. */
	startSeconds: number;
	index: number;
}

/**
 * Split mono/stereo 16-bit PCM WAV into fixed-duration chunks.
 * Chunk boundaries align to sample frames so frames aren't torn.
 */
export function splitWavIntoChunks(
	wavBytes: Uint8Array,
	chunkSeconds: number,
): AudioChunk[] {
	const parsed = parseWavPcm(wavBytes);
	if (!parsed) {
		return [{ wavBytes, startSeconds: 0, index: 0 }];
	}

	const bytesPerFrame = parsed.channels * (parsed.bitsPerSample / 8);
	const framesPerChunk = Math.max(1, Math.floor(chunkSeconds * parsed.sampleRate));
	const bytesPerChunk = framesPerChunk * bytesPerFrame;
	const chunks: AudioChunk[] = [];

	for (let offset = 0, index = 0; offset < parsed.pcm.length; offset += bytesPerChunk, index++) {
		const end = Math.min(offset + bytesPerChunk, parsed.pcm.length);
		// Align end to a whole frame.
		const alignedEnd = end - ((end - offset) % bytesPerFrame);
		if (alignedEnd <= offset) break;
		const pcmSlice = parsed.pcm.subarray(offset, alignedEnd);
		chunks.push({
			index,
			startSeconds: offset / bytesPerFrame / parsed.sampleRate,
			wavBytes: encodeWavPcm({
				pcm: pcmSlice,
				sampleRate: parsed.sampleRate,
				channels: parsed.channels,
				bitsPerSample: parsed.bitsPerSample,
			}),
		});
	}

	return chunks.length > 0 ? chunks : [{ wavBytes, startSeconds: 0, index: 0 }];
}

export async function mapPool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from(
		{ length: Math.max(1, Math.min(concurrency, items.length)) },
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
