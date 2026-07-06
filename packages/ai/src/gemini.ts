import { GoogleGenAI, Modality } from "@google/genai";

// Ensure the API key is present for Gemini calls
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 500 || error.status === 503 || error.status === 429)) {
      console.warn(`Gemini API error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function transcribeVideo(videoBase64: string, mimeType: string) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
  return withRetry(async () => {
    const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : "";
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following transcript ${sourceContext}into ${targetLanguage}. 

Guidelines:
- Maintain the speaker identification and timestamp format exactly: [MM:SS] Speaker: Text.
- Capture the tone and context accurately.
- For technical or slang terms, use the most natural equivalent in ${targetLanguage}.
- If there are multiple speakers, ensure the distinction between their voices is clear in the translation.

Transcript:
${text}`,
    });
    return response.text;
  });
}

export async function generateKiriSpeech(text: string, voice: string = 'Kiri') {
  return withRetry(async () => {
    const actualKey = process.env.KIRI_TTS_API_KEY;
    if (!actualKey) {
      throw new Error("KIRI_TTS_API_KEY environment variable is not defined.");
    }
    
    const url = 'https://api.kiritts.com/v1/audio/speech';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${actualKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'kiritts-1',
        input: text.replace(/\[\d{2}:\d{2}\]\s+/g, '').trim(),
        voice: voice,
        speed: 1.0,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `Kiri TTS Status ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errorMessage = errJson.detail || errJson.message || errorMessage;
      } catch (e) {
        errorMessage = errText || errorMessage;
      }
      throw new Error(`Kiri TTS API Error: ${errorMessage}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  });
}

export async function generateSpeech(text: string, voice: string = 'Kore') {
  if (voice.startsWith('kiri_')) {
    return generateKiriSpeech(text, voice.replace('kiri_', ''));
  }
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
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
  const speakerEntries = Object.entries(speakerVoices);
  const firstVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
  if (firstVoice.startsWith('kiri_')) {
    return generateKiriSpeech(text, firstVoice.replace('kiri_', ''));
  }

  if (speakerEntries.length === 2) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    try {
      const speakerConfigs = speakerEntries.map(([speaker, voice]) => ({
        speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice }
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
