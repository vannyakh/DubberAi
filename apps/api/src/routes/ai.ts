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
  planAutoCutRanges,
  planAgentCut,
} from '@dubbercut/ai';

const textInput = z.object({ text: z.string().min(1) });
const agentCutSocketRequest = z.object({
  type: z.literal('agent_cut_request'),
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  transcript: z.string().min(1),
  durationSeconds: z.number().positive(),
  minCutSeconds: z.number().positive(),
  paddingSeconds: z.number().min(0),
  clipSummaries: z
    .array(
      z.object({
        name: z.string(),
        trackLabel: z.string(),
        category: z.enum(['main', 'overlay', 'audio']),
        durationSeconds: z.number().positive().optional(),
      }),
    )
    .optional(),
});

/** Base64 video payloads are large; allow up to ~512 MB of JSON. */
const MEDIA_BODY_LIMIT = 512 * 1024 * 1024;

function sendSocketEvent(
  socket: { send: (payload: string) => void },
  event:
    | { type: 'status'; sessionId: string; stage: string; message: string }
    | {
        type: 'result';
        sessionId: string;
        result: Awaited<ReturnType<typeof planAgentCut>>;
      }
    | { type: 'error'; sessionId: string; message: string },
) {
  socket.send(JSON.stringify(event));
}

export async function aiRoutes(app: FastifyInstance) {
  app.get(
    '/agent-cut-session',
    { websocket: true },
    (socket) => {
      socket.on('message', async (raw: unknown) => {
        let parsed: z.infer<typeof agentCutSocketRequest>;
        try {
          parsed = agentCutSocketRequest.parse(JSON.parse(String(raw)));
        } catch (error) {
          sendSocketEvent(socket, {
            type: 'error',
            sessionId: 'unknown',
            message: error instanceof Error ? error.message : 'Invalid websocket payload',
          });
          return;
        }

        try {
          sendSocketEvent(socket, {
            type: 'status',
            sessionId: parsed.sessionId,
            stage: 'classifying',
            message: 'Classifying request',
          });

          sendSocketEvent(socket, {
            type: 'status',
            sessionId: parsed.sessionId,
            stage: 'planning',
            message: 'Planning edits',
          });

          const result = await planAgentCut({
            prompt: parsed.prompt,
            transcript: parsed.transcript,
            durationSeconds: parsed.durationSeconds,
            minCutSeconds: parsed.minCutSeconds,
            paddingSeconds: parsed.paddingSeconds,
            clipSummaries: parsed.clipSummaries?.map((clip) => ({
              name: clip.name,
              trackLabel: clip.trackLabel,
              category: clip.category,
              durationSeconds: clip.durationSeconds,
            })),
          });

          sendSocketEvent(socket, {
            type: 'result',
            sessionId: parsed.sessionId,
            result,
          });
        } catch (error) {
          sendSocketEvent(socket, {
            type: 'error',
            sessionId: parsed.sessionId,
            message: error instanceof Error ? error.message : 'Agent Cut realtime request failed',
          });
        }
      });
    },
  );

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

  app.post('/autocut-plan', async (request) => {
    const body = z
      .object({
        transcript: z.string().min(1),
        durationSeconds: z.number().positive(),
        minCutSeconds: z.number().positive(),
        paddingSeconds: z.number().min(0),
        cutFillers: z.boolean().optional(),
        cutLongPauses: z.boolean().optional(),
        cutRetakes: z.boolean().optional(),
      })
      .parse(request.body);
    const result = await planAutoCutRanges({
      transcript: body.transcript,
      durationSeconds: body.durationSeconds,
      minCutSeconds: body.minCutSeconds,
      paddingSeconds: body.paddingSeconds,
      cutFillers: body.cutFillers,
      cutLongPauses: body.cutLongPauses,
      cutRetakes: body.cutRetakes,
    });
    return { result };
  });

  app.post('/agent-cut-plan', async (request) => {
    const body = z
      .object({
        prompt: z.string().min(1),
        transcript: z.string().min(1),
        durationSeconds: z.number().positive(),
        minCutSeconds: z.number().positive(),
        paddingSeconds: z.number().min(0),
        clipSummaries: z
          .array(
            z.object({
              name: z.string(),
              trackLabel: z.string(),
              category: z.enum(['main', 'overlay', 'audio']),
              durationSeconds: z.number().positive().optional(),
            }),
          )
          .optional(),
      })
      .parse(request.body);
    const result = await planAgentCut({
      prompt: body.prompt,
      transcript: body.transcript,
      durationSeconds: body.durationSeconds,
      minCutSeconds: body.minCutSeconds,
      paddingSeconds: body.paddingSeconds,
      clipSummaries: body.clipSummaries?.map((clip) => ({
        name: clip.name,
        trackLabel: clip.trackLabel,
        category: clip.category,
        durationSeconds: clip.durationSeconds,
      })),
    });
    return { result };
  });
}
