import './env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { aiRoutes } from './routes/ai';
import { jobRoutes } from './routes/jobs';
import { uploadRoutes } from './routes/uploads';
import { cacheAvailable, closeCache } from './cache';
import { initQueue, closeQueue } from './queue';

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 1024 } });

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

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
