import { useCallback } from 'react';
import { useEditorStore } from '../editor-store';
import { exportTimeline } from '../services/export';

export function useEditorExport() {
  const clips = useEditorStore((s) => s.clips);
  const overlays = useEditorStore((s) => s.overlays);
  const filterId = useEditorStore((s) => s.filterId);
  const setExportState = useEditorStore((s) => s.setExportState);

  const startExport = useCallback(async () => {
    if (clips.length === 0) return;
    setExportState({ phase: 'preparing', progress: 0, error: null, outputUri: null });
    try {
      const uri = await exportTimeline(clips, filterId, overlays, {
        onPhase: (phase) => setExportState({ phase }),
        onProgress: (progress) => setExportState({ progress }),
      });
      setExportState({ phase: 'done', progress: 1, outputUri: uri });
    } catch (err) {
      setExportState({
        phase: 'error',
        error: err instanceof Error ? err.message : 'Export failed',
      });
    }
  }, [clips, filterId, overlays, setExportState]);

  return { startExport, canExport: clips.length > 0 };
}
