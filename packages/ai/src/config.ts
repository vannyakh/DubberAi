/**
 * 302.AI (https://302.ai) is the unified AI gateway: one key, OpenAI-compatible
 * /v1/chat/completions for text tasks, plus the official Gemini format at
 * /v1beta for multimodal (video transcription, TTS) calls.
 */

export const API_302_KEY = process.env.API_KEY_302 || '';
export const API_302_BASE_URL = process.env.API_302_BASE_URL || 'https://api.302.ai';

/** Chat model used for text tasks (translate, summarize, etc.). */
export const CHAT_MODEL = process.env.AI_302_CHAT_MODEL || 'gemini-2.5-flash';

export function assertAiKey() {
  if (!API_302_KEY) {
    throw new Error('API_KEY_302 environment variable is not defined.');
  }
}
