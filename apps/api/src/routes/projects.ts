import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { prisma } from '../db';
import { cacheGet, cacheSet, cacheDel } from '../cache';
import { serializeProject } from '../serialize';
import { Project } from '@dubbercute/types';

const projectInput = z.object({
  name: z.string().min(1),
  aspectRatio: z.string().optional(),
  videoUrl: z.string().optional(),
  transcript: z.string().optional(),
  translatedText: z.string().optional(),
  targetLang: z.string().optional(),
  selectedVoice: z.string().optional(),
});

const listKey = (userId: string) => `projects:${userId}`;
// Item keys are user-scoped so a cache hit never leaks another user's project.
const itemKey = (userId: string, id: string) => `project:${userId}:${id}`;

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const cached = await cacheGet<Project[]>(listKey(request.userId!));
    if (cached) return cached;

    const projects = await prisma.project.findMany({
      where: { ownerId: request.userId! },
      orderBy: { updatedAt: 'desc' },
    });
    const result = projects.map(serializeProject);
    await cacheSet(listKey(request.userId!), result, 60);
    return result;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cached = await cacheGet<Project>(itemKey(request.userId!, id));
    if (cached) return cached;

    const project = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    const result = serializeProject(project);
    await cacheSet(itemKey(request.userId!, id), result, 60);
    return result;
  });

  app.post('/', async (request, reply) => {
    const body = projectInput.parse(request.body);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        aspectRatio: body.aspectRatio,
        videoUrl: body.videoUrl,
        transcript: body.transcript,
        translatedText: body.translatedText,
        targetLang: body.targetLang,
        selectedVoice: body.selectedVoice,
        ownerId: request.userId!,
      },
    });
    await cacheDel(listKey(request.userId!));
    return reply.code(201).send(serializeProject(project));
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    const body = projectInput.partial().parse(request.body);
    const project = await prisma.project.update({ where: { id }, data: body });
    await cacheDel(listKey(request.userId!), itemKey(request.userId!, id));
    return serializeProject(project);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    await prisma.project.delete({ where: { id } });
    await cacheDel(listKey(request.userId!), itemKey(request.userId!, id));
    return reply.code(204).send();
  });
}
