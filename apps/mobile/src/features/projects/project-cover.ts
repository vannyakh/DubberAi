import { Project } from '@dubbercut/types';
import { EditorClip } from '@/features/editor/types';
import { resolvePlayableUri } from '@/features/editor/services/video-playback';
import { useProjectsStore } from '@/stores';
import {
  buildProjectCoverImage,
  captureCoverFrame,
  isCachedCoverUri,
  projectCoverFile,
} from './capture-cover-frame';

export type ProjectCoverFields = Pick<Project, 'videoUrl' | 'coverAssetId' | 'coverMediaType'>;

function pickCoverClip(clips: EditorClip[]): EditorClip | null {
  if (clips.length === 0) return null;
  return clips.find((clip) => clip.mediaType === 'video') ?? clips[0];
}

/** Sync cover fields from timeline clips (uses a video frame or image file). */
export function projectCoverFromClips(clips: EditorClip[]): ProjectCoverFields | null {
  const clip = pickCoverClip(clips);
  if (!clip) return null;
  return {
    videoUrl: clip.uri,
    coverAssetId: clip.libraryAssetId,
    coverMediaType: clip.mediaType,
  };
}

export async function resolveProjectCoverFields(
  projectId: string,
  clips: EditorClip[],
): Promise<ProjectCoverFields | null> {
  const clip = pickCoverClip(clips);
  if (!clip) return null;

  const playableUri = await resolvePlayableUri(clip.uri, clip.libraryAssetId);
  const coverUri = await buildProjectCoverImage(projectId, clip, playableUri);

  return {
    videoUrl: coverUri ?? playableUri,
    coverAssetId: clip.libraryAssetId,
    coverMediaType: clip.mediaType,
  };
}

export async function resolveProjectCoverUri(project: Project): Promise<string | null> {
  const cached = projectCoverFile(project.id);
  if (cached.exists) return cached.uri;

  if (project.videoUrl && isCachedCoverUri(project.videoUrl)) {
    return project.videoUrl;
  }

  if (!project.videoUrl && !project.coverAssetId) return null;

  const sourceUri = await resolvePlayableUri(project.videoUrl ?? '', project.coverAssetId);

  if (project.coverMediaType === 'video') {
    const frameUri = await captureCoverFrame(sourceUri, 0.15, project.id);
    return frameUri ?? sourceUri;
  }

  return sourceUri;
}

export async function syncProjectCover(projectId: string, clips: EditorClip[]): Promise<void> {
  const { update } = useProjectsStore.getState();
  const cover = await resolveProjectCoverFields(projectId, clips);
  if (cover) {
    await update(projectId, cover);
  }
}
