import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from './routes/projects';
import { aiRoutes } from './routes/ai';
import { jobRoutes } from './routes/jobs';

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(jobRoutes, { prefix: '/api/jobs' });

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
