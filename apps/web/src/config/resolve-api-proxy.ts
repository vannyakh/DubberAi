/** Probe localhost for a running DubberCut API (/health). Used by Vite dev proxy. */

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

/** Wait for the API during `dev:all` startup, trying PORT..PORT+9. */
export async function resolveApiProxyTarget({
  basePort,
  explicitUrl,
  maxWaitMs = 15_000,
}: {
  basePort: number;
  explicitUrl?: string;
  maxWaitMs?: number;
}): Promise<string> {
  if (explicitUrl) return explicitUrl;

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    for (let offset = 0; offset < 10; offset++) {
      const port = basePort + offset;
      if (await isApiHealthy(port)) {
        return `http://localhost:${port}`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return `http://localhost:${basePort}`;
}
