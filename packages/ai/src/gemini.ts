import { GoogleGenAI, Modality } from "@google/genai";
import { API_302_KEY, API_302_BASE_URL, assertAiKey } from "./config";
import { chatComplete } from "./chat";

/**
 * Multimodal calls (video transcription/analysis, TTS) go through the 302.AI
 * gateway using the official Gemini API format. The SDK builds
 * {baseUrl}/v1beta/models/{model}:generateContent, matching 302.AI's
 * official-format route at /v1/v1beta/models/{model}:generateContent.
 */
const ai = new GoogleGenAI({
  apiKey: API_302_KEY || "",
  httpOptions: { baseUrl: `${API_302_BASE_URL}/v1` },
});

async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 500 || error.status === 503 || error.status === 429)) {
      console.warn(`302.AI error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/** Legacy voice ids (e.g. "kiri_Kiri" from saved projects) map to a default prebuilt voice. */
function normalizeVoice(voice: string): string {
  return voice.startsWith("kiri_") ? "Kore" : voice;
}

export async function transcribeVideo(videoBase64: string, mimeType: string) {
  assertAiKey();
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `Please provide a verbatim transcript of the spoken dialogue in this video. 

IMPORTANT: 
- Identify the primary spoken language in the video.
- Ignore background music, songs, or non-speech sounds. 
- Only transcribe spoken words. 
- Identify different speakers (e.g., Speaker 1, Speaker 2).
- Include timestamps in the format [MM:SS] Speaker: Text.

Format your response as a JSON object:
{
  "detectedLanguage": "string (e.g. English, Khmer, Spanish)",
  "transcript": "string (the full formatted transcript)"
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "{}");
  });
}

export async function analyzeVideo(videoBase64: string, mimeType: string, language: string) {
  assertAiKey();
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `Analyze this video for a highlight summary in ${language}.
Provide:
1. A total summary.
2. A list of exactly 5-7 "Highlight Clips". For each clip, specify the start and end timestamp and a short narration script (1 sentence).

Format as JSON: 
{ 
  "summary": "string",
  "highlights": [
    { "start": "MM:SS", "end": "MM:SS", "narration": "string" }
  ]
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "{}");
  });
}

export async function translateText(text: string, targetLanguage: string, sourceLanguage?: string) {
  const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : "";
  return chatComplete(`Translate the following transcript ${sourceContext}into ${targetLanguage}. 

Guidelines:
- Maintain the speaker identification and timestamp format exactly: [MM:SS] Speaker: Text.
- Capture the tone and context accurately.
- For technical or slang terms, use the most natural equivalent in ${targetLanguage}.
- If there are multiple speakers, ensure the distinction between their voices is clear in the translation.

Transcript:
${text}`);
}

export async function generateSpeech(text: string, voice: string = 'Kore') {
  assertAiKey();
  const voiceName = normalizeVoice(voice);
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate audio");
    
    return base64Audio;
  });
}

export async function generateMultiSpeakerSpeech(text: string, speakerVoices: Record<string, string>) {
  assertAiKey();
  const speakerEntries = Object.entries(speakerVoices);

  if (speakerEntries.length === 2) {
    try {
      const speakerConfigs = speakerEntries.map(([speaker, voice]) => ({
        speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: normalizeVoice(voice) }
        }
      }));

      const cleanText = text.replace(/\[\d{2}:\d{2}\]\s+/g, '');

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: `TTS the following conversation:\n${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerConfigs
            }
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) return base64Audio;
      
      console.warn("Multi-speaker TTS returned no audio data, falling back to single speaker.");
    } catch (error) {
      console.warn("Multi-speaker TTS failed, falling back to single speaker:", error);
    }
  }
  
  const defaultVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
  return generateSpeech(text, defaultVoice);
}
