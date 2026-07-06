export interface TranscriptionInput {
  /** Base64-encoded media content */
  base64: string;
  mimeType: string;
}

export interface TranscriptionResult {
  /** Detected language name, e.g. "English" */
  detectedLanguage: string;
  /** Full transcript formatted as "[MM:SS] Speaker: Text" lines */
  transcript: string;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
