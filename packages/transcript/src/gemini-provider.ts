import { transcribeVideo } from '@video-voice-translator/ai';
import { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from './provider';

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'gemini';

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const result = await transcribeVideo(input.base64, input.mimeType);
    return {
      detectedLanguage: result.detectedLanguage || 'Unknown',
      transcript: result.transcript || '',
    };
  }
}
