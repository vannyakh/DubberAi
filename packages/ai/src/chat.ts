/**
 * Chat completions routed by model family, with Hugging Face fallback:
 * - gemini* → Gemini (or HF if GEMINI_API_KEY unset)
 * - claude* → Anthropic (or HF if ANTHROPIC_API_KEY unset)
 * - otherwise → OpenAI (or HF if OPENAI_API_KEY unset)
 */

import {
	ANTHROPIC_API_KEY,
	ANTHROPIC_BASE_URL,
	assertAnthropicKey,
	assertGeminiKey,
	assertOpenAiKey,
	CHAT_MODEL,
	GEMINI_API_KEY,
	GEMINI_BASE_URL,
	hasAnthropicKey,
	hasGeminiKey,
	hasHfToken,
	hasOpenAiKey,
	HF_CHAT_MODEL,
	isClaudeModel,
	isGeminiModel,
	OPENAI_API_KEY,
	OPENAI_BASE_URL,
} from './config';
import { chatHuggingFace } from './huggingface';

export interface ChatOptions {
	model?: string;
	json?: boolean;
	temperature?: number;
}

class ApiError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
	}
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
	try {
		return await fn();
	} catch (error: any) {
		if (retries > 0 && (error.status === 500 || error.status === 503 || error.status === 429)) {
			console.warn(`AI error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
			await new Promise((resolve) => setTimeout(resolve, delay));
			return withRetry(fn, retries - 1, delay * 2);
		}
		throw error;
	}
}

async function chatGemini(prompt: string, options: ChatOptions): Promise<string> {
	assertGeminiKey();
	const model = options.model || CHAT_MODEL;
	const url = `${GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: {
				...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
				...(options.json ? { responseMimeType: 'application/json' } : {}),
			},
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `Gemini chat failed with status ${response.status}`;
		try {
			const errJson = JSON.parse(errText);
			message = errJson.error?.message || errJson.message || message;
		} catch {
			if (errText) message = errText;
		}
		throw new ApiError(message, response.status);
	}

	const data = (await response.json()) as {
		candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
	};
	return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

async function chatAnthropic(prompt: string, options: ChatOptions): Promise<string> {
	assertAnthropicKey();
	const model = options.model || CHAT_MODEL;

	const response = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
		method: 'POST',
		headers: {
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			max_tokens: 8192,
			messages: [{ role: 'user', content: prompt }],
			...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `Anthropic chat failed with status ${response.status}`;
		try {
			const errJson = JSON.parse(errText);
			message = errJson.error?.message || errJson.message || message;
		} catch {
			if (errText) message = errText;
		}
		throw new ApiError(message, response.status);
	}

	const data = (await response.json()) as {
		content?: Array<{ type?: string; text?: string }>;
	};
	return (data.content ?? [])
		.filter((block) => block.type === 'text' && block.text)
		.map((block) => block.text || '')
		.join('');
}

async function chatOpenAi(prompt: string, options: ChatOptions): Promise<string> {
	assertOpenAiKey();
	const model = options.model || CHAT_MODEL;

	const response = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENAI_API_KEY}`,
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
		let message = `OpenAI chat failed with status ${response.status}`;
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

async function chatWithHfFallback(
	prompt: string,
	options: ChatOptions,
	preferred: () => Promise<string>,
	hasPreferred: boolean,
	label: string,
): Promise<string> {
	if (hasPreferred) return preferred();
	if (hasHfToken()) {
		console.warn(`${label} key unset — using Hugging Face (${HF_CHAT_MODEL}).`);
		return chatHuggingFace(prompt, {
			...options,
			model: HF_CHAT_MODEL,
		});
	}
	return preferred();
}

export async function chatComplete(prompt: string, options: ChatOptions = {}): Promise<string> {
	const model = options.model || CHAT_MODEL;
	return withRetry(async () => {
		if (isClaudeModel(model)) {
			return chatWithHfFallback(
				prompt,
				options,
				() => chatAnthropic(prompt, options),
				hasAnthropicKey(),
				'ANTHROPIC_API_KEY',
			);
		}
		if (isGeminiModel(model)) {
			return chatWithHfFallback(
				prompt,
				options,
				() => chatGemini(prompt, options),
				hasGeminiKey(),
				'GEMINI_API_KEY',
			);
		}
		return chatWithHfFallback(
			prompt,
			options,
			() => chatOpenAi(prompt, options),
			hasOpenAiKey(),
			'OPENAI_API_KEY',
		);
	});
}

/** Chat completion that parses a JSON object out of the response. */
export async function chatJson<T>(prompt: string, options: ChatOptions = {}): Promise<T> {
	const raw = await chatComplete(
		`${prompt}\n\nReturn valid JSON only. Do not include markdown fences or commentary.`,
		{ ...options, json: true },
	);
	const cleaned = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '');
	return JSON.parse(cleaned || '{}') as T;
}
