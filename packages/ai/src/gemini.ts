import {
  assertGeminiKey,
  assertOpenAiKey,
  CHAT_MODEL,
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  hasGeminiKey,
  hasHfToken,
  hasOpenAiKey,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  TRANSCRIBE_CHUNK_SECONDS,
  TRANSCRIBE_CONCURRENCY,
  TRANSCRIBE_MODEL,
  TTS_MODEL,
} from './config';
import { chatComplete } from './chat';
import { synthesizeHuggingFaceSpeech, transcribeHuggingFace } from './huggingface';
import { mapPool, splitWavIntoChunks } from './wav';

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && RETRYABLE_STATUSES.has(error.status)) {
      console.warn(`AI error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/** Legacy voice ids (e.g. "kiri_Kiri" from saved projects) map to a default prebuilt voice. */
function normalizeVoice(voice: string): string {
  return voice.startsWith('kiri_') ? 'Kore' : voice;
}

function formatMmSs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function extensionForMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  return 'wav';
}

function isAiMediaRefusal(text: string): boolean {
  return /cannot (directly )?access|unable to (provide|access|process)|cannot process (audio|video|media)|i am an ai/i.test(
    text,
  );
}

interface WhisperSegment {
  start?: number;
  end?: number;
  text?: string;
  speaker?: string;
}

interface WhisperTranscriptionResult {
  text?: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

function formatWhisperTranscript(result: WhisperTranscriptionResult): {
  transcript: string;
  detectedLanguage: string | null;
} {
  const language = result.language
    ? result.language.charAt(0).toUpperCase() + result.language.slice(1)
    : null;

  const segments = result.segments ?? [];
  if (segments.length > 0) {
    const lines = segments
      .map((segment, index) => {
        const text = (segment.text || '').trim();
        if (!text) return null;
        const labeledSpeaker = segment.speaker?.trim()
          ? segment.speaker.trim()
          : `Speaker ${index === 0 ? 1 : guessSpeakerIndex(segments, index)}`;

        const start = segment.start ?? 0;
        const prev = segments[index - 1];
        const gap =
          prev?.end != null && start > prev.end
            ? Number((start - prev.end).toFixed(1))
            : 0;
        const pausePrefix = gap >= 0.4 ? `(...${gap}s) ` : '';

        const next = segments[index + 1];
        const ownEnd = segment.end;
        const trailingGap =
          ownEnd != null && next?.start != null && next.start > ownEnd
            ? Number((next.start - ownEnd).toFixed(1))
            : 0;
        // Only put a trailing pause on the last speech token of this beat when
        // there is a long gap before the next Whisper chunk and this is not
        // represented as the next line's leading pause.
        const pauseSuffix =
          trailingGap >= 0.4 && index === segments.length - 1
            ? ` (...${trailingGap}s)`
            : '';

        return `[${formatMmSs(start)}] ${labeledSpeaker}: ${pausePrefix}${text}${pauseSuffix}`;
      })
      .filter((line): line is string => Boolean(line));

    if (lines.length > 0) {
      return { transcript: lines.join('\n'), detectedLanguage: language };
    }
  }

  const plain = (result.text || '').trim();
  if (!plain) {
    return { transcript: '', detectedLanguage: language };
  }
  if (isAiMediaRefusal(plain)) {
    throw new Error(
      'Transcription failed: the AI service did not receive usable audio. Try a shorter main-track clip.',
    );
  }
  return {
    transcript: `[00:00] Speaker 1: ${plain}`,
    detectedLanguage: language,
  };
}

function guessSpeakerIndex(segments: WhisperSegment[], index: number): number {
  // Without diarization labels, keep a single speaker unless explicit speaker fields appear later.
  const hasAnySpeaker = segments.some((segment) => Boolean(segment.speaker?.trim()));
  if (!hasAnySpeaker) return 1;
  const current = segments[index]?.speaker?.trim();
  if (!current) return 1;
  const unique: string[] = [];
  for (const segment of segments) {
    const name = segment.speaker?.trim();
    if (!name) continue;
    if (!unique.includes(name)) unique.push(name);
  }
  return Math.max(1, unique.indexOf(current) + 1);
}

/** Map spoken-language names to ISO-639-1 codes for Whisper's language hint. */
const LANGUAGE_ISO_CODES: Record<string, string> = {
  english: 'en',
  khmer: 'km',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  vietnamese: 'vi',
  thai: 'th',
  hindi: 'hi',
};

function isoCodeForLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const normalized = language.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  for (const [name, code] of Object.entries(LANGUAGE_ISO_CODES)) {
    if (normalized.includes(name)) return code;
  }
  return undefined;
}

/**
 * Speech-to-text: split WAV into chunks and transcribe in parallel.
 * Provider order: OpenAI Whisper → Gemini (audio input) → Hugging Face.
 * Never sends the full long-form payload as a single provider call.
 * `language` is an optional spoken-language hint; omit for auto-detect.
 */
export async function transcribeVideo(
  videoBase64: string,
  mimeType: string,
  language?: string,
) {
  if (!hasOpenAiKey() && !hasGeminiKey() && !hasHfToken()) {
    assertOpenAiKey();
  }

  const bytes = base64ToBytes(videoBase64);
  if (bytes.length === 0) {
    throw new Error('Transcription payload is empty');
  }

  const isWav = (mimeType || '').toLowerCase().includes('wav');
  const chunkMime = isWav ? 'audio/wav' : mimeType || 'audio/wav';
  const chunks = isWav
    ? splitWavIntoChunks(bytes, TRANSCRIBE_CHUNK_SECONDS)
    : [{ wavBytes: bytes, startSeconds: 0, index: 0 }];

  if (chunks.length > 1) {
    console.info(
      `STT: splitting into ${chunks.length} chunks (~${TRANSCRIBE_CHUNK_SECONDS}s) with concurrency ${TRANSCRIBE_CONCURRENCY}`,
    );
  }

  const chunkResults = await mapPool(
    chunks,
    TRANSCRIBE_CONCURRENCY,
    async (chunk) => {
      const result = await withRetry(() =>
        transcribeWavBytesBestProvider(chunk.wavBytes, chunkMime, language),
      );
      return {
        startSeconds: chunk.startSeconds,
        result,
      };
    },
  );

  const mergedSegments: WhisperSegment[] = [];
  let detectedLanguage: string | undefined;
  const plainParts: string[] = [];

  for (const { startSeconds, result } of chunkResults) {
    if (result.language && !detectedLanguage) detectedLanguage = result.language;
    if (result.segments && result.segments.length > 0) {
      for (const segment of result.segments) {
        mergedSegments.push({
          ...segment,
          start: (segment.start ?? 0) + startSeconds,
          end:
            segment.end != null ? segment.end + startSeconds : undefined,
        });
      }
    } else if (result.text?.trim()) {
      plainParts.push(result.text.trim());
      mergedSegments.push({
        start: startSeconds,
        text: result.text.trim(),
      });
    }
  }

  // Empty is valid for a silent/music-only chunk. Callers that split media
  // into parallel uploads merge non-empty parts and only fail if all are empty.
  return formatWhisperTranscript({
    language: detectedLanguage ?? language,
    text: plainParts.join(' ').trim() || undefined,
    segments: mergedSegments,
  });
}

function transcribeWavBytesBestProvider(
  bytes: Uint8Array,
  mimeType: string,
  language?: string,
): Promise<WhisperTranscriptionResult> {
  if (hasOpenAiKey()) return transcribeWavBytesOpenAi(bytes, mimeType, language);
  if (hasGeminiKey()) return transcribeWavBytesGemini(bytes, mimeType, language);
  return transcribeWavBytesHf(bytes);
}

async function transcribeWavBytesOpenAi(
  bytes: Uint8Array,
  mimeType: string,
  language?: string,
): Promise<WhisperTranscriptionResult> {
  assertOpenAiKey();
  const isoCode = isoCodeForLanguage(language);

  const postTranscription = async ({
    model,
    responseFormat,
  }: {
    model: string;
    responseFormat: 'verbose_json' | 'json';
  }) => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(bytes)], {
      type: mimeType || 'audio/wav',
    });
    form.append('file', blob, `audio.${extensionForMime(mimeType)}`);
    form.append('model', model);
    form.append('response_format', responseFormat);
    if (isoCode) form.append('language', isoCode);

    return fetch(`${OPENAI_BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
    });
  };

  const parseError = async (response: Response) => {
    const errText = await response.text();
    let message = `Transcription failed with status ${response.status}`;
    try {
      const errJson = JSON.parse(errText) as {
        error?: { message?: string };
        message?: string;
      };
      message = errJson.error?.message || errJson.message || message;
    } catch {
      if (errText) message = errText;
    }
    return { message };
  };

  const attempts: Array<{ model: string; responseFormat: 'verbose_json' | 'json' }> = [
    { model: TRANSCRIBE_MODEL, responseFormat: 'verbose_json' },
    { model: TRANSCRIBE_MODEL, responseFormat: 'json' },
  ];
  if (TRANSCRIBE_MODEL !== 'whisper-1') {
    attempts.push(
      { model: 'whisper-1', responseFormat: 'verbose_json' },
      { model: 'whisper-1', responseFormat: 'json' },
    );
  }

  let response: Response | null = null;
  let lastError = 'Transcription failed';
  for (const attempt of attempts) {
    response = await postTranscription(attempt);
    if (response.ok) break;
    const { message } = await parseError(response);
    lastError = message;
    const retryable = /parameter|invalid|unsupported/i.test(message);
    if (!retryable) throw new ApiError(message, response.status);
    console.warn(
      `STT rejected ${attempt.model}/${attempt.responseFormat}; trying fallback…`,
    );
    response = null;
  }
  if (!response?.ok) {
    throw new ApiError(lastError, 400);
  }

  const payload = (await response.json()) as WhisperTranscriptionResult | string;
  if (typeof payload === 'string') {
    const text = payload.trim();
    if (!text) throw new Error('Transcription returned no dialogue');
    if (isAiMediaRefusal(text)) {
      throw new Error(
        'Transcription failed: the AI service did not receive usable audio. Try a shorter main-track clip.',
      );
    }
    return { text };
  }
  return payload;
}

const GEMINI_STT_PROMPT = `Transcribe this audio verbatim.
Return JSON only, in this exact shape:
{"language":"english","segments":[{"start":0.0,"end":2.5,"speaker":"Speaker 1","text":"..."}]}
Rules:
- "start" and "end" are decimal seconds measured from the beginning of THIS audio.
- Label distinct voices "Speaker 1", "Speaker 2", ... and keep labels consistent.
- Keep each segment to one spoken sentence or phrase.
- If there is no speech, return {"language":null,"segments":[]}.`;

async function transcribeWavBytesGemini(
  bytes: Uint8Array,
  mimeType: string,
  language?: string,
): Promise<WhisperTranscriptionResult> {
  console.warn('OPENAI_API_KEY unset — transcribing with Gemini.');
  const prompt = language
    ? `${GEMINI_STT_PROMPT}\n- The audio is spoken in ${language}; transcribe it in that language's native script.`
    : GEMINI_STT_PROMPT;
  const response = await fetch(geminiGenerateUrl(CHAT_MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'audio/wav',
                data: bytesToBase64(bytes),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    let message = `Gemini transcription failed with status ${response.status}`;
    try {
      const errJson = JSON.parse(raw) as {
        error?: { message?: string };
        message?: string;
      };
      message = errJson.error?.message || errJson.message || message;
    } catch {
      if (raw) message = raw;
    }
    throw new ApiError(message, response.status);
  }

  const data = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ||
    '';
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned || '{}') as {
      language?: string | null;
      segments?: WhisperSegment[];
    };
    return {
      language: parsed.language ?? undefined,
      segments: parsed.segments ?? [],
    };
  } catch {
    // Model answered in prose despite the JSON instruction.
    if (cleaned) return { text: cleaned };
    throw new Error('Gemini transcription returned no parseable output');
  }
}

async function transcribeWavBytesHf(bytes: Uint8Array): Promise<WhisperTranscriptionResult> {
  console.warn('No OpenAI/Gemini key — using Hugging Face Whisper.');
  const payload = await transcribeHuggingFace(bytes);
  const segments =
    payload.chunks?.map((chunk) => ({
      text: chunk.text,
      start: chunk.timestamp?.[0],
      end: chunk.timestamp?.[1],
    })) ?? undefined;
  return {
    text: payload.text,
    language: payload.language,
    segments,
  };
}

export async function analyzeVideo(videoBase64: string, mimeType: string, language: string) {
  // Best-effort: transcribe first, then ask the chat model for highlights.
  const { transcript } = await transcribeVideo(videoBase64, mimeType);
  if (!transcript?.trim()) {
    throw new Error('Transcription returned no dialogue');
  }
  const raw = await chatComplete(`Analyze this transcript for a highlight summary in ${language}.

Transcript:
${transcript}

Provide:
1. A total summary.
2. A list of exactly 5-7 "Highlight Clips". For each clip, specify the start and end timestamp and a short narration script (1 sentence).

Format as JSON:
{
  "summary": "string",
  "highlights": [
    { "start": "MM:SS", "end": "MM:SS", "narration": "string" }
  ]
}`);
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned || '{}');
}

export async function translateText(text: string, targetLanguage: string, sourceLanguage?: string) {
  const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : '';
  const isKhmer = /khmer|ខ្មែរ/i.test(targetLanguage);
  const scriptGuidelines = isKhmer
    ? `- Write the translation in native Khmer Unicode script (U+1780–U+17FF), never romanized transliteration.
- Use natural Khmer punctuation and spacing suitable for on-screen captions and TTS playback.`
    : `- Preserve the original script and writing system of ${targetLanguage}. Do not transliterate unless the source already uses Latin letters.`;

  return chatComplete(`Translate the following transcript ${sourceContext}into ${targetLanguage}. 

Guidelines:
- Maintain the speaker identification and timestamp format exactly: [MM:SS] Speaker: Text.
- Preserve pause markers exactly when present, e.g. (...1.3s) or (...237.3s). Place them at the same relative positions in the translated line.
- Capture the tone and context accurately.
- For technical or slang terms, use the most natural equivalent in ${targetLanguage}.
- If there are multiple speakers, ensure the distinction between their voices is clear in the translation.
${scriptGuidelines}

Transcript:
${text}`);
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function extractPcmBase64FromWav(wavBytes: Uint8Array): string {
  if (wavBytes.length < 44) {
    return bytesToBase64(wavBytes);
  }
  let offset = 12;
  while (offset + 8 <= wavBytes.length) {
    const chunkId = String.fromCharCode(
      wavBytes[offset]!,
      wavBytes[offset + 1]!,
      wavBytes[offset + 2]!,
      wavBytes[offset + 3]!,
    );
    const chunkSize = readUint32LE(wavBytes, offset + 4);
    const dataStart = offset + 8;
    if (chunkId === 'data') {
      return bytesToBase64(wavBytes.subarray(dataStart, dataStart + chunkSize));
    }
    offset = dataStart + chunkSize + (chunkSize % 2);
  }
  return bytesToBase64(wavBytes.subarray(44));
}

async function resolveTtsAudioBase64({
  data,
  mimeType,
}: {
  data: string;
  mimeType?: string;
}): Promise<string> {
  let bytes: Uint8Array;
  if (/^https?:\/\//i.test(data)) {
    const response = await fetch(data);
    if (!response.ok) {
      throw new Error(`Failed to download TTS audio (${response.status})`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } else {
    bytes = base64ToBytes(data);
  }

  const mime = (mimeType || '').toLowerCase();
  const looksWav =
    mime.includes('wav') ||
    mime.includes('wave') ||
    String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!) === 'RIFF';
  if (looksWav) {
    return extractPcmBase64FromWav(bytes);
  }
  return bytesToBase64(bytes);
}

type TtsInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type TtsPart = {
  text?: string;
  inlineData?: TtsInlineData;
  inline_data?: TtsInlineData;
  fileData?: { fileUri?: string; mimeType?: string };
  file_data?: { file_uri?: string; mime_type?: string };
};

function sanitizeTtsText(text: string): string {
  return text
    .replace(/\[\d{2}:\d{2}\]\s*/g, '')
    .replace(/^[A-Za-z0-9 _.-]+:\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

interface TtsStyle {
  feeling?: string;
  intensity?: string;
  delivery?: string;
  persona?: string;
  pace?: string;
  voiceTone?: string;
}

function buildEmotionalTtsText({
  text,
  style,
}: {
  text: string;
  style?: TtsStyle;
}): string {
  const spoken = sanitizeTtsText(text);
  if (!spoken) return spoken;
  const hasStyle =
    style?.feeling ||
    style?.delivery ||
    style?.persona ||
    style?.pace ||
    style?.voiceTone;
  if (!hasStyle) return spoken;

  const mood =
    style.feeling && style.feeling !== 'neutral' ? style.feeling : null;
  const energy = style.intensity || 'medium';
  const parts = mood
    ? [`Speak with a ${mood} emotional tone`, `at ${energy} intensity`]
    : [
        'Speak naturally and conversationally, like a real person in everyday dialogue',
        'with subtle intonation shifts and a relaxed, lifelike rhythm — never flat or robotic',
      ];
  if (style.voiceTone) parts.push(`in a ${style.voiceTone} voice`);
  if (style.pace && style.pace !== 'normal') {
    parts.push(`at a ${style.pace} speaking pace`);
  }
  if (style.persona) parts.push(`as ${style.persona}`);
  if (style.delivery) parts.push(`using ${style.delivery}`);
  parts.push(
    'Sound like a real human performance with natural breaths and timing. Do not narrate stage directions out loud.',
  );
  return `${parts.join(', ')}.\n\nDialogue:\n${spoken}`;
}

function extractAudioFromTtsPayload(payload: unknown): { data: string; mimeType?: string } | null {
  const root = payload as {
    candidates?: Array<{ content?: { parts?: TtsPart[] } }>;
    data?: string;
    audio?: string;
    result?: string | { data?: string; mimeType?: string };
  };

  for (const candidate of root.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) {
        return {
          data: inline.data,
          mimeType: inline.mimeType || inline.mime_type,
        };
      }
      const fileUri = part.fileData?.fileUri || part.file_data?.file_uri;
      if (fileUri) {
        return {
          data: fileUri,
          mimeType: part.fileData?.mimeType || part.file_data?.mime_type,
        };
      }
    }
  }

  if (typeof root.data === 'string' && root.data) {
    return { data: root.data };
  }
  if (typeof root.audio === 'string' && root.audio) {
    return { data: root.audio };
  }
  if (typeof root.result === 'string' && root.result) {
    return { data: root.result };
  }
  if (root.result && typeof root.result === 'object' && root.result.data) {
    return { data: root.result.data, mimeType: root.result.mimeType };
  }
  return null;
}

function geminiGenerateUrl(model: string): string {
  return `${GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
}

async function requestGeminiTts({
  text,
  voiceName,
}: {
  text: string;
  voiceName: string;
}): Promise<string> {
  const body = {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const response = await fetch(geminiGenerateUrl(TTS_MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errJson = payload as {
      error?: { message?: string };
      message?: string;
    } | null;
    const lastError =
      errJson?.error?.message ||
      errJson?.message ||
      `TTS failed with status ${response.status}`;
    throw new ApiError(lastError, response.status);
  }

  const audio = extractAudioFromTtsPayload(payload);
  if (audio?.data) {
    return resolveTtsAudioBase64(audio);
  }
  throw new Error('Failed to generate audio');
}

async function requestHuggingFaceTts(text: string): Promise<string> {
  const bytes = await synthesizeHuggingFaceSpeech(text);
  return resolveTtsAudioBase64({
    data: bytesToBase64(bytes),
    mimeType: 'audio/wav',
  });
}

/**
 * Gemini TTS when GEMINI_API_KEY is set; otherwise Hugging Face TTS.
 * Optional style cues are folded into the prompt for emotional delivery.
 */
export async function generateSpeech(
  text: string,
  voice: string = 'Kore',
  style?: TtsStyle,
) {
  const cleanText = buildEmotionalTtsText({ text, style });
  if (!cleanText) {
    throw new Error('Speech synthesis requires non-empty dialogue text');
  }

  if (!hasGeminiKey()) {
    if (!hasHfToken()) {
      assertGeminiKey();
    }
    console.warn('GEMINI_API_KEY unset — using Hugging Face TTS.');
    return withRetry(async () => requestHuggingFaceTts(cleanText));
  }

  const voiceName = normalizeVoice(voice);
  return withRetry(async () => requestGeminiTts({ text: cleanText, voiceName }));
}

export async function generateMultiSpeakerSpeech(text: string, speakerVoices: Record<string, string>) {
  const speakerEntries = Object.entries(speakerVoices);
  const cleanText = sanitizeTtsText(text);
  if (!cleanText) {
    throw new Error('Speech synthesis requires non-empty dialogue text');
  }

  // Prefer per-speaker single clips upstream; multi-speaker remains a fallback.
  if (hasGeminiKey() && speakerEntries.length === 2) {
    try {
      const speakerConfigs = speakerEntries.map(([speaker, voice]) => ({
        speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: normalizeVoice(voice) },
        },
      }));

      const response = await fetch(geminiGenerateUrl(TTS_MODEL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `TTS the following conversation:\n${cleanText}` }],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerConfigs,
              },
            },
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const audio = extractAudioFromTtsPayload(payload);
        if (audio?.data) {
          return resolveTtsAudioBase64(audio);
        }
      }

      console.warn('Multi-speaker TTS returned no audio data, falling back to single speaker.');
    } catch (error) {
      console.warn('Multi-speaker TTS failed, falling back to single speaker:', error);
    }
  }

  const defaultVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
  return generateSpeech(cleanText, defaultVoice);
}
