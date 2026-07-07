import { Project, RenderJob, User } from '@dubbercute/types';

/** Prisma returns Date objects; the wire format uses ISO strings. */

export function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeProject(project: {
  id: string;
  name: string;
  aspectRatio?: string | null;
  videoUrl: string | null;
  transcript: string | null;
  translatedText: string | null;
  targetLang: string | null;
  selectedVoice: string | null;
  createdAt: Date;
}): Project {
  return {
    id: project.id,
    name: project.name,
    aspectRatio: project.aspectRatio ?? undefined,
    videoUrl: project.videoUrl ?? undefined,
    transcript: project.transcript ?? undefined,
    translatedText: project.translatedText ?? undefined,
    targetLang: project.targetLang ?? undefined,
    selectedVoice: project.selectedVoice ?? undefined,
    createdAt: project.createdAt.toISOString(),
  };
}

export function serializeJob(job: {
  id: string;
  projectId: string;
  kind: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RenderJob {
  return {
    id: job.id,
    projectId: job.projectId,
    kind: job.kind as RenderJob['kind'],
    status: job.status as RenderJob['status'],
    progress: job.progress,
    error: job.error ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
