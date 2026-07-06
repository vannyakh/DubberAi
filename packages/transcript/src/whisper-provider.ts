import { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from './provider';

export interface WhisperProviderOptions {
  /** Base URL of a Faster-Whisper server (e.g. http://localhost:8000) */
  baseUrl: string;
  model?: string;
}

/**
 * Talks to a Faster-Whisper compatible HTTP server
 * (e.g. https://github.com/fedirz/faster-whisper-server, OpenAI-compatible /v1/audio/transcriptions).
 */
export class WhisperTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'whisper';

  constructor(private readonly options: WhisperProviderOptions) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const binary = atob(input.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: input.mimeType });

    const form = new FormData();
    form.append('file', blob, 'media');
    form.append('model', this.options.model || 'Systran/faster-whisper-small');
    form.append('response_format', 'verbose_json');

    const response = await fetch(`${this.options.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Whisper transcription failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const segments: Array<{ start: number; text: string }> = data.segments || [];
    const transcript = segments.length
      ? segments
          .map((s) => {
            const m = Math.floor(s.start / 60);
            const sec = Math.floor(s.start % 60);
            const mm = String(m).padStart(2, '0');
            const ss = String(sec).padStart(2, '0');
            return `[${mm}:${ss}] Speaker 1: ${s.text.trim()}`;
          })
          .join('\n')
      : data.text || '';

    return {
      detectedLanguage: data.language || 'Unknown',
      transcript,
    };
  }
}
