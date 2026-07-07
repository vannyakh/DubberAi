import { create } from 'zustand';
import {
  clipDuration,
  clipTimelineStart,
  EditorClip,
  ExportState,
  FilterId,
  TextOverlay,
  timelineDuration,
} from './types';

/**
 * Editor state lives in zustand (not React context) so timeline gestures and
 * playback ticks can update slices without re-rendering the whole tree.
 * High-frequency values used by worklets (scrub position during a drag) stay
 * in Reanimated shared values; only committed values land here.
 */
interface EditorState {
  clips: EditorClip[];
  selectedClipId: string | null;
  overlays: TextOverlay[];
  filterId: FilterId;
  /** Committed playhead position in seconds on the global timeline. */
  playhead: number;
  isPlaying: boolean;
  /** Timeline zoom: pixels per second. Pinch gesture writes here. */
  pxPerSecond: number;
  exportState: ExportState;

  addClip: (clip: EditorClip) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  trimClip: (id: string, trimStart: number, trimEnd: number) => void;
  splitClipAt: (time: number) => void;
  moveClip: (id: string, direction: -1 | 1) => void;

  addOverlay: (overlay: TextOverlay) => void;
  updateOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  removeOverlay: (id: string) => void;

  setFilter: (id: FilterId) => void;
  setClipFilter: (clipId: string, id: FilterId) => void;
  toggleClipMuted: (clipId: string) => void;
  trimSelectedAtPlayhead: (edge: 'in' | 'out') => void;
  setPlayhead: (seconds: number) => void;
  setPlaying: (playing: boolean) => void;
  setPxPerSecond: (px: number) => void;
  setExportState: (patch: Partial<ExportState>) => void;
  reset: () => void;
}

const initialExport: ExportState = { phase: 'idle', progress: 0, error: null, outputUri: null };

export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  selectedClipId: null,
  overlays: [],
  filterId: 'none',
  playhead: 0,
  isPlaying: false,
  pxPerSecond: 60,
  exportState: initialExport,

  addClip: (clip) =>
    set((s) => ({ clips: [...s.clips, clip], selectedClipId: clip.id })),

  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),

  selectClip: (id) => set({ selectedClipId: id }),

  trimClip: (id, trimStart, trimEnd) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id
          ? {
              ...c,
              trimStart: Math.max(0, Math.min(trimStart, c.sourceDuration)),
              trimEnd: Math.max(trimStart + 0.1, Math.min(trimEnd, c.sourceDuration)),
            }
          : c,
      ),
    })),

  splitClipAt: (time) => {
    const { clips } = get();
    let cursor = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const d = clipDuration(clip);
      const local = time - cursor;
      if (local > 0.1 && local < d - 0.1) {
        const first: EditorClip = { ...clip, trimEnd: clip.trimStart + local };
        const second: EditorClip = {
          ...clip,
          id: `${clip.id}-${Date.now().toString(36)}`,
          trimStart: clip.trimStart + local,
        };
        const next = [...clips.slice(0, i), first, second, ...clips.slice(i + 1)];
        set({ clips: next, selectedClipId: second.id });
        return;
      }
      cursor += d;
    }
  },

  moveClip: (id, direction) =>
    set((s) => {
      const index = s.clips.findIndex((c) => c.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= s.clips.length) return s;
      const clips = [...s.clips];
      [clips[index], clips[target]] = [clips[target], clips[index]];
      return { clips };
    }),

  addOverlay: (overlay) => set((s) => ({ overlays: [...s.overlays, overlay] })),
  updateOverlay: (id, patch) =>
    set((s) => ({
      overlays: s.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),
  removeOverlay: (id) => set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) })),

  setFilter: (id) => set({ filterId: id }),

  setClipFilter: (clipId, id) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === clipId ? { ...c, filterId: id } : c)),
    })),

  toggleClipMuted: (clipId) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === clipId ? { ...c, muted: !c.muted } : c)),
    })),

  trimSelectedAtPlayhead: (edge) => {
    const { clips, selectedClipId, playhead } = get();
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;
    const start = clipTimelineStart(clips, selectedClipId);
    const local = playhead - start;
    const duration = clipDuration(clip);
    if (local <= 0.05 || local >= duration - 0.05) return;
    if (edge === 'in') {
      get().trimClip(selectedClipId, clip.trimStart + local, clip.trimEnd);
      set({ playhead: start });
    } else {
      get().trimClip(selectedClipId, clip.trimStart, clip.trimStart + local);
    }
  },

  setPlayhead: (seconds) =>
    set((s) => ({
      playhead: Math.max(0, Math.min(seconds, timelineDuration(s.clips))),
    })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setPxPerSecond: (px) => set({ pxPerSecond: Math.max(12, Math.min(px, 480)) }),

  setExportState: (patch) => set((s) => ({ exportState: { ...s.exportState, ...patch } })),

  reset: () =>
    set({
      clips: [],
      selectedClipId: null,
      overlays: [],
      filterId: 'none',
      playhead: 0,
      isPlaying: false,
      pxPerSecond: 60,
      exportState: initialExport,
    }),
}));
