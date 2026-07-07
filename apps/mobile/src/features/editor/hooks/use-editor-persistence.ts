import { useEffect, useRef } from 'react';
import { saveEditorComposition } from '../services/editor-persistence';
import { syncProjectCover } from '@/features/projects/project-cover';
import { useEditorStore } from '../editor-store';

const SAVE_DEBOUNCE_MS = 800;

/** Debounced auto-save of timeline state — mirrors web SaveManager cadence. */
export function useEditorPersistence(projectId: string | undefined, ready: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  useEffect(() => {
    if (!projectId || !ready) return;

    const flush = () => {
      const id = projectIdRef.current;
      if (!id) return;
      const snapshot = useEditorStore.getState().getCompositionSnapshot();
      void saveEditorComposition(id, snapshot);
      void syncProjectCover(id, snapshot.clips);
    };

    flush();

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };

    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.clips === prev.clips &&
        state.overlays === prev.overlays &&
        state.filterId === prev.filterId &&
        state.canvasAspectId === prev.canvasAspectId &&
        state.canvasBackground === prev.canvasBackground &&
        state.pxPerSecond === prev.pxPerSecond
      ) {
        return;
      }
      schedule();
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      // Always flush on leave — never skip just because the debounce timer cleared.
      flush();
    };
  }, [projectId, ready]);
}
