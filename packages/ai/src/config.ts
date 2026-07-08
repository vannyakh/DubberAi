/**
 * 302.AI (https://302.ai) is the unified AI gateway:
 * - OpenAI-compatible /v1/chat/completions for text
 * - /v1/audio/transcriptions (Whisper) for speech-to-text
 * - /google/v1/models/{tts-model} for Gemini TTS
 */

export const API_302_KEY = process.env.API_KEY_302 || '';
export const API_302_BASE_URL = process.env.API_302_BASE_URL || 'https://api.302.ai';

/** Chat model used for text tasks (translate, summarize, etc.). */
export const CHAT_MODEL = process.env.AI_302_CHAT_MODEL || 'gemini-2.5-flash';

/**
 * Whisper STT model for dubbing / autocut transcription.
 * Many 302 keys accept OpenAI-compatible `whisper-1`; `whisper-v3-turbo`
 * often returns -10003 (parameter error) on the same account.
 */
export const TRANSCRIBE_MODEL =
	process.env.AI_302_TRANSCRIBE_MODEL || 'whisper-1';

/** Dedicated Gemini TTS model (speechConfig requires this, not text flash). */
export const TTS_MODEL =
	process.env.AI_302_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

/** Anthropic Claude model for LLM-based auto-cut planning (via 302.AI). */
export const AUTOCUT_MODEL =
	process.env.AI_302_AUTOCUT_MODEL || 'claude-sonnet-5';

/** Higher-quality Claude model for Agent Cut intent + edit planning. */
export const AGENT_CUT_MODEL =
	process.env.AI_302_AGENT_CUT_MODEL || 'claude-opus-4-8';

export function assertAiKey() {
  if (!API_302_KEY) {
    throw new Error('API_KEY_302 environment variable is not defined.');
  }
}
