import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  translateText,
  summarizeText,
  correctGrammar,
  generateChapters,
  generateHashtags,
  generateTitles,
  transcribeVideo,
  analyzeVideo,
  generateSpeech,
  generateMultiSpeakerSpeech,
} from '@video-voice-translator/ai';

const textInput = z.object({ text: z.string().min(1) });

/** Base64 video payloads are large; allow up to ~512 MB of JSON. */
const MEDIA_BODY_LIMIT = 512 * 1024 * 1024;

export async function aiRoutes(app: FastifyInstance) {
  app.post(
    '/transcribe',
    { bodyLimit: MEDIA_BODY_LIMIT },
    async (request) => {
      const body = z
        .object({ videoBase64: z.string().min(1), mimeType: z.string().min(1) })
        .parse(request.body);
      const result = await transcribeVideo(body.videoBase64, body.mimeType);
      return { result };
    },
  );

  app.post(
    '/analyze',
    { bodyLimit: MEDIA_BODY_LIMIT },
    async (request) => {
      const body = z
        .object({
          videoBase64: z.string().min(1),
          mimeType: z.string().min(1),
          language: z.string().min(1),
        })
        .parse(request.body);
      const result = await analyzeVideo(body.videoBase64, body.mimeType, body.language);
      return { result };
    },
  );

  app.post('/tts', async (request) => {
    const body = textInput.extend({ voice: z.string().optional() }).parse(request.body);
    const result = await generateSpeech(body.text, body.voice);
    return { result };
  });

  app.post('/tts-multi', async (request) => {
    const body = textInput
      .extend({ speakerVoices: z.record(z.string(), z.string()) })
      .parse(request.body);
    const result = await generateMultiSpeakerSpeech(body.text, body.speakerVoices);
    return { result };
  });

  app.post('/translate', async (request) => {
    const body = textInput.extend({ targetLanguage: z.string(), sourceLanguage: z.string().optional() }).parse(request.body);
    const result = await translateText(body.text, body.targetLanguage, body.sourceLanguage);
    return { result };
  });

  app.post('/summarize', async (request) => {
    const body = textInput.extend({ language: z.string().optional() }).parse(request.body);
    const result = await summarizeText(body.text, body.language);
    return { result };
  });

  app.post('/grammar', async (request) => {
    const body = textInput.extend({ language: z.string().optional() }).parse(request.body);
    const result = await correctGrammar(body.text, body.language);
    return { result };
  });

  app.post('/chapters', async (request) => {
    const body = textInput.parse(request.body);
    const result = await generateChapters(body.text);
    return { result };
  });

  app.post('/hashtags', async (request) => {
    const body = textInput.extend({ count: z.number().int().positive().optional() }).parse(request.body);
    const result = await generateHashtags(body.text, body.count);
    return { result };
  });

  app.post('/titles', async (request) => {
    const body = textInput.extend({ count: z.number().int().positive().optional() }).parse(request.body);
    const result = await generateTitles(body.text, body.count);
    return { result };
  });
}
