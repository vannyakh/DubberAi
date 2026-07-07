import { stageEditorClips } from '@/features/editor/editor-bootstrap';
import { EditorClip } from '@/features/editor/types';
import { resolveProjectCoverFields } from '@/features/projects/project-cover';
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

  const cover = await resolveProjectCoverFields(project.id, clips);
  if (cover) {
    await update(project.id, cover);
  }

  stageEditorClips(project.id, clips);
  return project.id;
}
