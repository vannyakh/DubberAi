import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { serializeJob } from '../serialize';

const createJobInput = z.object({
  projectId: z.string(),
  kind: z.enum(['render', 'export', 'ai']),
});

const updateJobInput = z.object({
  status: z.enum(['queued', 'processing', 'completed', 'failed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
});

export async function jobRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { status, kind } = request.query as { status?: string; kind?: string };
    const jobs = await prisma.renderJob.findMany({
      where: { status: status || undefined, kind: kind || undefined },
      orderBy: { createdAt: 'asc' },
    });
    return jobs.map(serializeJob);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.renderJob.findUnique({ where: { id } });
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return serializeJob(job);
  });

  app.post('/', async (request, reply) => {
    const body = createJobInput.parse(request.body);
    const job = await prisma.renderJob.create({
      data: { projectId: body.projectId, kind: body.kind },
    });
    return reply.code(201).send(serializeJob(job));
  });

  /** Workers claim the oldest queued job of a given kind. */
  app.post('/claim', async (request, reply) => {
    const { kind } = z.object({ kind: z.enum(['render', 'export', 'ai']) }).parse(request.body);
    const job = await prisma.renderJob.findFirst({
      where: { status: 'queued', kind },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return reply.code(204).send();
    const claimed = await prisma.renderJob.update({
      where: { id: job.id },
      data: { status: 'processing' },
    });
    return serializeJob(claimed);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.renderJob.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Job not found' });
    const body = updateJobInput.parse(request.body);
    const job = await prisma.renderJob.update({ where: { id }, data: body });
    return serializeJob(job);
  });
}
