import { Project, RenderJob } from '@video-voice-translator/types';

/**
 * In-memory store. Replace with @video-voice-translator/database (Prisma/SQLite)
 * when persistence is required.
 */
export const store = {
  projects: new Map<string, Project>(),
  jobs: new Map<string, RenderJob>(),
};

export function newId(): string {
  return crypto.randomUUID();
}
