import '@dubbercut/env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { aiRoutes } from './routes/ai';
import { jobRoutes } from './routes/jobs';
import { uploadRoutes } from './routes/uploads';
import { soundRoutes } from './routes/sounds';
import { cacheAvailable, closeCache } from './cache';
import { initQueue, closeQueue } from './queue';
import { listenWithFallback } from './listen';

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 1024 } });
  await app.register(websocket);

  initQueue();
  app.addHook('onClose', async () => {
    await Promise.all([closeCache(), closeQueue()]);
  });

  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    cache: cacheAvailable() ? 'redis' : 'disabled',
  }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(jobRoutes, { prefix: '/api/jobs' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(soundRoutes, { prefix: '/api/sounds' });

  // '::' binds IPv6 + IPv4 — required for Railway private networking.
  await listenWithFallback({ app, preferredPort: PORT });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
