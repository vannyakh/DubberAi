import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { prisma } from '../db';
import { serializeProject } from '../serialize';

const projectInput = z.object({
  name: z.string().min(1),
  videoUrl: z.string().optional(),
  transcript: z.string().optional(),
  translatedText: z.string().optional(),
  targetLang: z.string().optional(),
  selectedVoice: z.string().optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const projects = await prisma.project.findMany({
      where: { ownerId: request.userId! },
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map(serializeProject);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    return serializeProject(project);
  });

  app.post('/', async (request, reply) => {
    const body = projectInput.parse(request.body);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        videoUrl: body.videoUrl,
        transcript: body.transcript,
        translatedText: body.translatedText,
        targetLang: body.targetLang,
        selectedVoice: body.selectedVoice,
        ownerId: request.userId!,
      },
    });
    return reply.code(201).send(serializeProject(project));
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    const body = projectInput.partial().parse(request.body);
    const project = await prisma.project.update({ where: { id }, data: body });
    return serializeProject(project);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({ where: { id, ownerId: request.userId! } });
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    await prisma.project.delete({ where: { id } });
    return reply.code(204).send();
  });
}
