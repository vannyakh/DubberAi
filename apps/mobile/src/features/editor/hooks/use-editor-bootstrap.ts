import { useEffect, useState } from 'react';
import { consumeEditorClips } from '../editor-bootstrap';
import { useEditorStore } from '../editor-store';
import { emptyComposition, loadEditorComposition } from '../services/editor-persistence';
import { rehydrateClipPlayableUris } from '../services/video-playback';

/** Loads staged or persisted timeline state when the editor opens for a project. */
export function useEditorBootstrap(projectId: string | undefined) {
  const reset = useEditorStore((s) => s.reset);
  const hydrate = useEditorStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);
    reset();

    void (async () => {
      const staged = consumeEditorClips(projectId);
      if (staged.length > 0) {
        const clips = await rehydrateClipPlayableUris(staged);
        hydrate({ ...emptyComposition(), clips });
      } else {
        const saved = await loadEditorComposition(projectId);
        if (saved) {
          const clips = await rehydrateClipPlayableUris(saved.clips);
          hydrate({ ...saved, clips });
        }
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, reset, hydrate]);

  return ready;
}
