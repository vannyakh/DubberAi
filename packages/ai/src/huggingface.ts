/**
 * Hugging Face Inference Providers — OpenAI-compatible chat + TTS fallback.
 * Docs: https://huggingface.co/docs/inference-providers
 */

import {
	assertHfToken,
	HF_CHAT_MODEL,
	HF_ROUTER_BASE_URL,
	HF_TOKEN,
	HF_TRANSCRIBE_MODEL,
	HF_TTS_MODEL,
} from './config';

class ApiError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
	}
}

export async function chatHuggingFace(
	prompt: string,
	options: { model?: string; json?: boolean; temperature?: number } = {},
): Promise<string> {
	assertHfToken();
	const model = options.model || HF_CHAT_MODEL;

	const response = await fetch(`${HF_ROUTER_BASE_URL}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			messages: [{ role: 'user', content: prompt }],
			...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
			...(options.json ? { response_format: { type: 'json_object' } } : {}),
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `Hugging Face chat failed with status ${response.status}`;
		try {
			const errJson = JSON.parse(errText);
			message = errJson.error?.message || errJson.message || message;
		} catch {
			if (errText) message = errText;
		}
		throw new ApiError(message, response.status);
	}

	const data = (await response.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
	};
	return data.choices?.[0]?.message?.content || '';
}

/**
 * Text-to-speech via HF Inference. Returns raw audio bytes (usually WAV/FLAC).
 */
export async function synthesizeHuggingFaceSpeech(text: string): Promise<Uint8Array> {
	assertHfToken();
	const urls = [
		`${HF_ROUTER_BASE_URL}/hf-inference/models/${encodeURIComponent(HF_TTS_MODEL)}`,
		`${HF_ROUTER_BASE_URL}/models/${encodeURIComponent(HF_TTS_MODEL)}`,
	];

	let lastError = 'Hugging Face TTS failed';
	for (const url of urls) {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${HF_TOKEN}`,
				'Content-Type': 'application/json',
				Accept: 'audio/wav, audio/flac, application/json',
			},
			body: JSON.stringify({ inputs: text }),
		});

		if (!response.ok) {
			const errText = await response.text();
			try {
				const errJson = JSON.parse(errText) as {
					error?: string;
					message?: string;
				};
				lastError = errJson.error || errJson.message || lastError;
			} catch {
				if (errText) lastError = errText;
			}
			if (response.status === 503 || response.status === 429) {
				throw new ApiError(lastError, response.status);
			}
			continue;
		}

		const contentType = (response.headers.get('content-type') || '').toLowerCase();
		if (contentType.includes('application/json')) {
			const payload = (await response.json()) as {
				audio?: string;
				error?: string;
			};
			if (payload.error) {
				lastError = payload.error;
				continue;
			}
			if (payload.audio) {
				return Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0));
			}
			lastError = 'Hugging Face TTS returned JSON without audio';
			continue;
		}

		return new Uint8Array(await response.arrayBuffer());
	}

	throw new Error(lastError);
}

export interface HfTranscriptionResult {
	text?: string;
	language?: string;
	chunks?: Array<{ text?: string; timestamp?: [number, number] }>;
}

/**
 * Speech-to-text via HF Whisper (Inference Providers).
 * Returns text + optional timed chunks when the model provides them.
 */
export async function transcribeHuggingFace(
	wavBytes: Uint8Array,
): Promise<HfTranscriptionResult> {
	assertHfToken();
	const url = `${HF_ROUTER_BASE_URL}/hf-inference/models/${encodeURIComponent(HF_TRANSCRIBE_MODEL)}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
			'Content-Type': 'audio/wav',
			Accept: 'application/json',
		},
		body: new Uint8Array(wavBytes),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `Hugging Face STT failed with status ${response.status}`;
		try {
			const errJson = JSON.parse(errText) as { error?: string; message?: string };
			message = errJson.error || errJson.message || message;
		} catch {
			if (errText) message = errText;
		}
		throw new ApiError(message, response.status);
	}

	const payload = (await response.json()) as HfTranscriptionResult | string;
	if (typeof payload === 'string') {
		return { text: payload };
	}
	return payload;
}
