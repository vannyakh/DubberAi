/**
 * Shared env loader: every Node process (API, workers, scripts) imports this
 * first so all configuration lives in one place — the repo-root .env files.
 * The web app reads the same files via Vite's `envDir` (apps/web/vite.config.ts).
 *
 * Load order (first hit wins, existing shell vars always win):
 *   .env.<NODE_ENV>.local  →  .env.local  →  .env.<NODE_ENV>  →  .env
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

function findRepoRoot(start: string): string {
  let dir = start;
  while (true) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const root = findRepoRoot(process.cwd());
const nodeEnv = process.env.NODE_ENV || 'development';

const files = [
  `.env.${nodeEnv}.local`,
  '.env.local',
  `.env.${nodeEnv}`,
  '.env',
];

for (const file of files) {
  const full = path.join(root, file);
  if (existsSync(full)) {
    try {
      // Does not overwrite variables that are already set.
      process.loadEnvFile(full);
    } catch {
      // ignore malformed env files
    }
  }
}
