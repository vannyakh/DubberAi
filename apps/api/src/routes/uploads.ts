import { FastifyInstance } from 'fastify';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { requireAuth } from '../auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file provided' });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destination = path.join(UPLOAD_DIR, safeName);
    await pipeline(file.file, createWriteStream(destination));

    return reply.code(201).send({
      filename: safeName,
      originalName: file.filename,
      mimeType: file.mimetype,
      url: `/api/uploads/${safeName}`,
    });
  });
}
