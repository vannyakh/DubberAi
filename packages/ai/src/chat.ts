/**
 * OpenAI-compatible chat completions via the 302.AI gateway.
 * Docs: https://doc-en.302.ai (drop-in replacement for api.openai.com).
 */

import { API_302_KEY, API_302_BASE_URL, CHAT_MODEL, assertAiKey } from './config';

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
      console.warn(`302.AI error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function chatComplete(prompt: string, options: ChatOptions = {}): Promise<string> {
  assertAiKey();
  return withRetry(async () => {
    const makeRequest = async (jsonMode: boolean) =>
      fetch(`${API_302_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_302_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || CHAT_MODEL,
          messages: [{ role: 'user', content: prompt }],
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

    let response = await makeRequest(Boolean(options.json));

    if (!response.ok && options.json) {
      const fallbackErrorText = await response.text();
      let shouldRetryWithoutJsonMode = false;
      try {
        const fallbackErrorJson = JSON.parse(fallbackErrorText) as {
          error?: { err_code?: number; message?: string };
          message?: string;
        };
        const message =
          fallbackErrorJson.error?.message || fallbackErrorJson.message || '';
        shouldRetryWithoutJsonMode =
          fallbackErrorJson.error?.err_code === -10003 ||
          /parameter error/i.test(message) ||
          /request parameters/i.test(message);
      } catch {
        shouldRetryWithoutJsonMode = /parameter error/i.test(fallbackErrorText);
      }

      if (shouldRetryWithoutJsonMode) {
        response = await makeRequest(false);
      } else {
        const errText = fallbackErrorText;
        let message = `302.AI chat completions failed with status ${response.status}`;
        try {
          const errJson = JSON.parse(errText);
          message = errJson.error?.message || errJson.message || message;
        } catch {
          if (errText) message = errText;
        }
        throw new ApiError(message, response.status);
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let message = `302.AI chat completions failed with status ${response.status}`;
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
  });
}

/** Chat completion that parses a JSON object out of the response. */
export async function chatJson<T>(prompt: string, options: ChatOptions = {}): Promise<T> {
  const raw = await chatComplete(
    `${prompt}\n\nReturn valid JSON only. Do not include markdown fences or commentary.`,
    { ...options, json: true },
  );
  // Some models wrap JSON in markdown fences despite json mode.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned || '{}') as T;
}
