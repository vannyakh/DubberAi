/**
 * Hugging Face Inference Providers — OpenAI-compatible chat + TTS fallback.
 * Docs: https://huggingface.co/docs/inference-providers
 */

import {
	assertHfToken,
	HF_CHAT_MODEL,
	HF_CHAT_MODEL_FALLBACKS,
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

function isUnsupportedModelError(message: string): boolean {
	return /not supported by any provider|model .* not (found|available|supported)|does not exist/i.test(
		message,
	);
}

/** Per-request timeout — HF cold starts can take a while with x-wait-for-model. */
const HF_REQUEST_TIMEOUT_MS = Math.max(
	30_000,
	Number(process.env.HF_REQUEST_TIMEOUT_MS || 120_000),
);

/** Gateway/cold-start errors worth retrying. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function cleanErrorBody(errText: string, fallback: string): string {
	if (!errText) return fallback;
	try {
		const errJson = JSON.parse(errText) as {
			error?: string | { message?: string };
			message?: string;
		};
		if (typeof errJson.error === 'string') return errJson.error;
		return errJson.error?.message || errJson.message || fallback;
	} catch {
		// HTML gateway pages (e.g. "504 Gateway Time-out") aren't useful verbatim.
		if (/<html/i.test(errText)) {
			const title = errText.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
			return title ? `Hugging Face gateway error: ${title}` : fallback;
		}
		return errText.slice(0, 300);
	}
}

/**
 * Fetch with timeout and retry/backoff on gateway and cold-start errors.
 * Retries network failures and 408/429/5xx up to `retries` times.
 */
async function hfFetchWithRetry(
	url: string,
	init: RequestInit,
	retries = 3,
	delayMs = 2000,
): Promise<Response> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const response = await fetch(url, {
				...init,
				signal: AbortSignal.timeout(HF_REQUEST_TIMEOUT_MS),
			});
			if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
				return response;
			}
			// Drain body so the connection can be reused, keep message for the throw.
			const body = await response.text();
			lastError = new ApiError(
				cleanErrorBody(body, `Hugging Face request failed (${response.status})`),
				response.status,
			);
		} catch (error) {
			lastError = error;
		}
		if (attempt < retries) {
			const wait = delayMs * 2 ** attempt;
			console.warn(
				`HF request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${wait}ms…`,
			);
			await new Promise((resolve) => setTimeout(resolve, wait));
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('Hugging Face request failed');
}

export async function chatHuggingFace(
	prompt: string,
	options: { model?: string; json?: boolean; temperature?: number } = {},
): Promise<string> {
	assertHfToken();
	const preferred = options.model || HF_CHAT_MODEL;
	const candidates = [
		preferred,
		...HF_CHAT_MODEL_FALLBACKS.filter((model) => model !== preferred),
	];

	let lastError = 'Hugging Face chat failed';
	for (const model of candidates) {
		let response: Response;
		try {
			response = await hfFetchWithRetry(
				`${HF_ROUTER_BASE_URL}/v1/chat/completions`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${HF_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model,
						messages: [{ role: 'user', content: prompt }],
						...(options.temperature !== undefined
							? { temperature: options.temperature }
							: {}),
						...(options.json ? { response_format: { type: 'json_object' } } : {}),
					}),
				},
			);
		} catch (error) {
			lastError = error instanceof Error ? error.message : lastError;
			continue;
		}

		if (response.ok) {
			if (model !== preferred) {
				console.warn(`HF chat: ${preferred} unavailable — using ${model}`);
			}
			const data = (await response.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
			};
			return data.choices?.[0]?.message?.content || '';
		}

		lastError = cleanErrorBody(await response.text(), lastError);

		if (isUnsupportedModelError(lastError)) {
			console.warn(`HF chat model unavailable (${model}): ${lastError}`);
			continue;
		}
		throw new ApiError(lastError, response.status);
	}

	throw new ApiError(lastError, 400);
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
		let response: Response;
		try {
			response = await hfFetchWithRetry(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${HF_TOKEN}`,
					'Content-Type': 'application/json',
					Accept: 'audio/wav, audio/flac, application/json',
					// Block until the model is loaded instead of failing on cold start.
					'x-wait-for-model': 'true',
				},
				body: JSON.stringify({
					inputs: text,
					options: { wait_for_model: true },
				}),
			});
		} catch (error) {
			lastError = error instanceof Error ? error.message : lastError;
			continue;
		}

		if (!response.ok) {
			lastError = cleanErrorBody(await response.text(), lastError);
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

	const response = await hfFetchWithRetry(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
			'Content-Type': 'audio/wav',
			Accept: 'application/json',
			'x-wait-for-model': 'true',
		},
		body: new Uint8Array(wavBytes),
	});

	if (!response.ok) {
		throw new ApiError(
			cleanErrorBody(
				await response.text(),
				`Hugging Face STT failed with status ${response.status}`,
			),
			response.status,
		);
	}

	const payload = (await response.json()) as HfTranscriptionResult | string;
	if (typeof payload === 'string') {
		return { text: payload };
	}
	return payload;
}
