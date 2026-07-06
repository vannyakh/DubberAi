import { GeminiTranscriptionProvider } from './gemini-provider';
import { TranscriptionProvider } from './provider';
import { WhisperTranscriptionProvider } from './whisper-provider';

export function createTranscriptionProvider(
  kind: 'gemini' | 'whisper',
  options?: { whisperBaseUrl?: string; whisperModel?: string }
): TranscriptionProvider {
  if (kind === 'whisper') {
    if (!options?.whisperBaseUrl) {
      throw new Error('whisperBaseUrl is required for the whisper provider');
    }
    return new WhisperTranscriptionProvider({
      baseUrl: options.whisperBaseUrl,
      model: options.whisperModel,
    });
  }
  return new GeminiTranscriptionProvider();
}
