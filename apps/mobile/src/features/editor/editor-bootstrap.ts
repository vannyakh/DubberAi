import { EditorClip } from '@/features/editor/types';

let pending: { projectId: string; clips: EditorClip[] } | null = null;

/** Clips to load when the editor opens for a freshly created project. */
export function stageEditorClips(projectId: string, clips: EditorClip[]): void {
  pending = { projectId, clips };
}

export function consumeEditorClips(projectId: string): EditorClip[] {
  if (pending?.projectId !== projectId) return [];
  const clips = pending.clips;
  pending = null;
  return clips;
}
