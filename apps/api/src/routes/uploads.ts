import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../auth';
import { localReadStream, putObject, r2DownloadUrl, storageDriver } from '../storage';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file provided' });

    const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
    await putObject(key, file.file, file.mimetype);

    return reply.code(201).send({
      filename: key,
      originalName: file.filename,
      mimeType: file.mimetype,
      storage: storageDriver,
      url: `/api/uploads/${key}`,
    });
  });

  // No auth: media players (<video src>) can't attach Bearer headers.
  // Keys contain a random component, so they are not enumerable.
  app.get('/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (key.includes('/') || key.includes('..')) {
      return reply.code(400).send({ error: 'Invalid key' });
    }

    if (storageDriver === 'r2') {
      return reply.redirect(await r2DownloadUrl(key), 302);
    }

    const file = await localReadStream(key);
    if (!file) return reply.code(404).send({ error: 'Not found' });
    reply.header('Content-Length', file.size);
    return reply.send(file.stream);
  });
}
