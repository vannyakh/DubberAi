import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RenderJob } from '@video-voice-translator/types';
import { store, newId } from '../store';

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
    let jobs = Array.from(store.jobs.values());
    if (status) jobs = jobs.filter((j) => j.status === status);
    if (kind) jobs = jobs.filter((j) => j.kind === kind);
    return jobs;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.jobs.get(id);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return job;
  });

  app.post('/', async (request, reply) => {
    const body = createJobInput.parse(request.body);
    const now = new Date().toISOString();
    const job: RenderJob = {
      id: newId(),
      projectId: body.projectId,
      kind: body.kind,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.jobs.set(job.id, job);
    return reply.code(201).send(job);
  });

  /** Workers claim the oldest queued job of a given kind. */
  app.post('/claim', async (request, reply) => {
    const { kind } = z.object({ kind: z.enum(['render', 'export', 'ai']) }).parse(request.body);
    const queued = Array.from(store.jobs.values())
      .filter((j) => j.status === 'queued' && j.kind === kind)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const job = queued[0];
    if (!job) return reply.code(204).send();
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    return job;
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.jobs.get(id);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    const body = updateJobInput.parse(request.body);
    Object.assign(job, body, { updatedAt: new Date().toISOString() });
    return job;
  });
}
