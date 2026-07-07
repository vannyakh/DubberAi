import { Directory, File, Paths } from 'expo-file-system';
import { EditorClip } from '@/features/editor/types';
import {
  extractVideoFrame,
  isNativeMediaAvailable,
} from '../../../modules/dubber-media';

const coversDir = () => new Directory(Paths.document, 'dubbercut', 'project-covers');

function ensureCoversDir(): Directory {
  const dir = coversDir();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Persistent JPEG cover for a project. */
export function projectCoverFile(projectId: string): File {
  return new File(ensureCoversDir(), `${projectId}.jpg`);
}

function isImageUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    uri.includes('/project-covers/')
  );
}

function coverFrameTime(clip: EditorClip): number {
  const duration = Math.max(0.05, clip.sourceDuration);
  const start = Math.max(0, clip.trimStart);
  return Math.min(start + 0.15, duration - 0.05);
}

function pickCoverClip(clips: EditorClip[]): EditorClip | null {
  if (clips.length === 0) return null;
  return clips.find((clip) => clip.mediaType === 'video') ?? clips[0];
}

async function copyImageToCover(sourceUri: string, dest: File): Promise<string> {
  const source = new File(sourceUri);
  if (source.exists) {
    const bytes = await source.arrayBuffer();
    await dest.write(new Uint8Array(bytes));
    return dest.uri;
  }
  return sourceUri;
}

/** Writes a JPEG cover frame and returns its file uri. */
export async function captureCoverFrame(
  playableUri: string,
  timeSeconds: number,
  projectId: string,
): Promise<string | null> {
  const dest = projectCoverFile(projectId);

  if (!isNativeMediaAvailable) return null;

  try {
    const uri = await extractVideoFrame(playableUri, timeSeconds, dest.uri);
    return dest.exists ? uri : null;
  } catch {
    return null;
  }
}

export async function buildProjectCoverImage(
  projectId: string,
  clip: EditorClip,
  playableUri: string,
): Promise<string | null> {
  if (clip.mediaType === 'image') {
    const dest = projectCoverFile(projectId);
    try {
      return await copyImageToCover(playableUri, dest);
    } catch {
      return playableUri;
    }
  }

  return captureCoverFrame(playableUri, coverFrameTime(clip), projectId);
}

export function isCachedCoverUri(uri: string | undefined): boolean {
  return !!uri && isImageUri(uri);
}
