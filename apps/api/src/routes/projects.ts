import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Project } from '@video-voice-translator/types';
import { store, newId } from '../store';

const projectInput = z.object({
  name: z.string().min(1),
  videoUrl: z.string().optional(),
  transcript: z.string().optional(),
  translatedText: z.string().optional(),
  targetLang: z.string().optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  app.get('/', async () => Array.from(store.projects.values()));

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = store.projects.get(id);
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    return project;
  });

  app.post('/', async (request, reply) => {
    const body = projectInput.parse(request.body);
    const project: Project = {
      ...body,
      name: body.name,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    store.projects.set(project.id, project);
    return reply.code(201).send(project);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = store.projects.get(id);
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    const body = projectInput.partial().parse(request.body);
    const updated = { ...existing, ...body };
    store.projects.set(id, updated);
    return updated;
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!store.projects.delete(id)) return reply.code(404).send({ error: 'Project not found' });
    return reply.code(204).send();
  });
}
