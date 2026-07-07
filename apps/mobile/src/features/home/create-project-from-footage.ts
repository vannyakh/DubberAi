import { EditorClip } from '@/features/editor/types';
import { stageEditorClips } from '@/features/editor/editor-bootstrap';
import { useProjectsStore } from '@/stores';

function defaultProjectName(clips: EditorClip[]): string {
  const stamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (clips.length === 1) {
    const label = clips[0].mediaType === 'image' ? 'Photo' : 'Video';
    return `${label} · ${stamp}`;
  }
  return `Project · ${stamp}`;
}

export async function createProjectFromClips(clips: EditorClip[]): Promise<string | null> {
  if (clips.length === 0) return null;

  const { create, update } = useProjectsStore.getState();
  const project = await create(defaultProjectName(clips));

  const firstVideo = clips.find((c) => c.mediaType === 'video');
  if (firstVideo) {
    await update(project.id, { videoUrl: firstVideo.uri });
  }

  stageEditorClips(project.id, clips);
  return project.id;
}
