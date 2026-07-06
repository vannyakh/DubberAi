import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  translateText,
  summarizeText,
  correctGrammar,
  generateChapters,
  generateHashtags,
  generateTitles,
} from '@video-voice-translator/ai';

const textInput = z.object({ text: z.string().min(1) });

export async function aiRoutes(app: FastifyInstance) {
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
