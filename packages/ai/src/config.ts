/**
 * Provider keys and fallbacks:
 * - Gemini: chat + TTS (preferred when set)
 * - OpenAI: Whisper STT
 * - Anthropic: Claude auto-cut / agent-cut
 * - Hugging Face: LLM + TTS fallback when Gemini/Anthropic are unset
 */

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_BASE_URL =
	process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const OPENAI_BASE_URL =
	process.env.OPENAI_BASE_URL || 'https://api.openai.com';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const ANTHROPIC_BASE_URL =
	process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

/** Hugging Face token — Inference Providers (chat) + TTS fallback. */
export const HF_TOKEN =
	process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '';
export const HF_ROUTER_BASE_URL =
	process.env.HF_ROUTER_BASE_URL || 'https://router.huggingface.co';
/** OpenAI-compatible chat model on the HF router. */
export const HF_CHAT_MODEL =
	process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
/** HF Inference text-to-speech model. */
export const HF_TTS_MODEL =
	process.env.HF_TTS_MODEL || 'facebook/mms-tts-eng';

/** Chat model used for text tasks (translate, summarize, etc.). */
export const CHAT_MODEL = process.env.AI_CHAT_MODEL || 'gemini-2.5-flash';

/** Whisper STT model for dubbing / autocut transcription. */
export const TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || 'whisper-1';

/** Split long audio into this many seconds per Whisper request. */
export const TRANSCRIBE_CHUNK_SECONDS = Math.max(
	5,
	Number(process.env.AI_TRANSCRIBE_CHUNK_SECONDS || 30),
);

/** Max parallel Whisper chunk requests. */
export const TRANSCRIBE_CONCURRENCY = Math.max(
	1,
	Number(process.env.AI_TRANSCRIBE_CONCURRENCY || 3),
);

/** HF Whisper model when OPENAI_API_KEY is unset. */
export const HF_TRANSCRIBE_MODEL =
	process.env.HF_TRANSCRIBE_MODEL || 'openai/whisper-large-v3';

/** Dedicated Gemini TTS model (speechConfig requires this, not text flash). */
export const TTS_MODEL =
	process.env.AI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

/** Anthropic Claude model for LLM-based auto-cut planning. */
export const AUTOCUT_MODEL =
	process.env.AI_AUTOCUT_MODEL || 'claude-sonnet-4-5-20250929';

/** Higher-quality Claude model for Agent Cut intent + edit planning. */
export const AGENT_CUT_MODEL =
	process.env.AI_AGENT_CUT_MODEL || 'claude-opus-4-20250514';

export function assertGeminiKey() {
	if (!GEMINI_API_KEY) {
		throw new Error('GEMINI_API_KEY environment variable is not defined.');
	}
}

export function assertOpenAiKey() {
	if (!OPENAI_API_KEY) {
		throw new Error('OPENAI_API_KEY environment variable is not defined.');
	}
}

export function assertAnthropicKey() {
	if (!ANTHROPIC_API_KEY) {
		throw new Error('ANTHROPIC_API_KEY environment variable is not defined.');
	}
}

export function assertHfToken() {
	if (!HF_TOKEN) {
		throw new Error(
			'HF_TOKEN (or HUGGINGFACE_API_KEY) environment variable is not defined.',
		);
	}
}

export function hasGeminiKey() {
	return Boolean(GEMINI_API_KEY);
}

export function hasAnthropicKey() {
	return Boolean(ANTHROPIC_API_KEY);
}

export function hasOpenAiKey() {
	return Boolean(OPENAI_API_KEY);
}

export function hasHfToken() {
	return Boolean(HF_TOKEN);
}

export function isClaudeModel(model: string): boolean {
	return /claude/i.test(model);
}

export function isGeminiModel(model: string): boolean {
	return /gemini/i.test(model);
}
