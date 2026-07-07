import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Loads env files before anything else reads process.env:
 * the app-local .env, then the repo-root .env / .env.local
 * (API_KEY_302, AUTH_SECRET, ...). Existing shell vars win.
 */
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../.env.local'),
];

for (const file of candidates) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // ignore malformed env files
    }
  }
}
