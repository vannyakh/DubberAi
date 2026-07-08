import type { FastifyInstance } from 'fastify';

const MAX_PORT_ATTEMPTS = 10;

export async function isApiHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Bind the API, reusing an existing healthy instance on the default port
 * or falling back to the next free port when something else holds it.
 */
export async function listenWithFallback({
  app,
  preferredPort,
}: {
  app: FastifyInstance;
  preferredPort: number;
}): Promise<number> {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset++) {
    const port = preferredPort + offset;

    if (offset > 0 && (await isApiHealthy(port))) {
      app.log.warn(
        `Port ${port} already serves this API — exiting duplicate dev instance`,
      );
      process.exit(0);
    }

    try {
      await app.listen({ port, host: '::' });
      if (offset > 0) {
        app.log.warn(
          `Port ${preferredPort} was busy — API listening on http://localhost:${port} instead`,
        );
      } else {
        app.log.info(`API ready at http://localhost:${port}`);
      }
      return port;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EADDRINUSE') throw err;

      if (offset === 0 && (await isApiHealthy(port))) {
        app.log.warn(
          `API already running on http://localhost:${port} — skipping second instance`,
        );
        process.exit(0);
      }

      app.log.warn(`Port ${port} in use, trying ${port + 1}…`);
    }
  }

  throw new Error(
    `No free port in range ${preferredPort}-${preferredPort + MAX_PORT_ATTEMPTS - 1}`,
  );
}
