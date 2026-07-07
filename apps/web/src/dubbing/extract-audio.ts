import { decodeAudioToFloat32 } from "@/media/audio";

/**
 * Gemini's inline-data limit is ~20 MB per request, so sending whole
 * videos fails for anything but tiny clips (the model then answers
 * "I cannot process video content"). Speech is all the transcriber
 * needs, so we decode the file locally and ship a compact mono WAV.
 */
const TRANSCRIBE_SAMPLE_RATE = 16000;
const MAX_INLINE_AUDIO_BYTES = 19 * 1024 * 1024;

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

/**
 * Decode a media file's audio track to 16 kHz mono WAV base64 suitable
 * for inline transcription requests.
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
	if (wav.length > MAX_INLINE_AUDIO_BYTES) {
		const minutes = Math.round(
			wav.length / (TRANSCRIBE_SAMPLE_RATE * 2 * 60),
		);
		throw new Error(
			`The video is too long to transcribe in one request (~${minutes} min of audio). Split it into shorter clips and dub them separately.`,
		);
	}

	return { base64: bytesToBase64(wav), mimeType: "audio/wav" };
}
