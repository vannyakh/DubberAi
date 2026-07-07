import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth';
import { prisma } from '../db';
import { serializeUser } from '../serialize';

const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerInput.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: 'Email already registered' });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: hashPassword(body.password),
      },
    });
    return reply.code(201).send({ token: signToken(user.id), user: serializeUser(user) });
  });

  app.post('/login', async (request, reply) => {
    const body = loginInput.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    return { token: signToken(user.id), user: serializeUser(user) };
  });

  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.userId! } });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return serializeUser(user);
  });
}
