import { create } from 'zustand';
import { CanvasAspectId } from './aspect-ratios';
import { CanvasBackgroundMode, CanvasBlurType } from './canvas-background';
import {
  clipDuration,
  clipTimelineStart,
  EditorClip,
  ExportState,
  FilterId,
  hasUnlimitedTrimOut,
  MediaOverlay,
  TextOverlay,
  timelineDuration,
} from './types';
import { EditorComposition, COMPOSITION_VERSION, emptyComposition } from './services/editor-persistence';

/**
 * Editor state lives in zustand (not React context) so timeline gestures and
 * playback ticks can update slices without re-rendering the whole tree.
 * High-frequency values used by worklets (scrub position during a drag) stay
 * in Reanimated shared values; only committed values land here.
 */
interface EditorState {
  clips: EditorClip[];
  selectedClipId: string | null;
  mediaOverlays: MediaOverlay[];
  selectedMediaOverlayId: string | null;
  overlays: TextOverlay[];
  filterId: FilterId;
  /** Committed playhead position in seconds on the global timeline. */
  playhead: number;
  isPlaying: boolean;
  /** Timeline zoom: pixels per second. Pinch gesture writes here. */
  pxPerSecond: number;
  canvasAspectId: CanvasAspectId;
  canvasBackground: string;
  canvasBackgroundMode: CanvasBackgroundMode;
  canvasBlurType: CanvasBlurType;
  exportState: ExportState;

  addClip: (clip: EditorClip) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  addMediaOverlay: (overlay: MediaOverlay) => void;
  removeMediaOverlay: (id: string) => void;
  selectMediaOverlay: (id: string | null) => void;
  updateMediaOverlay: (id: string, patch: Partial<MediaOverlay>) => void;
  setMediaOverlayTransform: (
    id: string,
    patch: Partial<
      Pick<
        MediaOverlay,
        'contentScale' | 'contentOffsetX' | 'contentOffsetY' | 'contentRotation'
      >
    >,
  ) => void;
  trimClip: (id: string, trimStart: number, trimEnd: number) => void;
  splitClipAt: (time: number) => void;
  moveClip: (id: string, direction: -1 | 1) => void;
  reorderClip: (id: string, toIndex: number) => void;
  setMediaOverlayStartTime: (id: string, startTime: number) => void;
  trimMediaOverlay: (
    id: string,
    patch: Partial<Pick<MediaOverlay, 'trimStart' | 'trimEnd' | 'startTime'>>,
  ) => void;

  addOverlay: (overlay: TextOverlay) => void;
  updateOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  removeOverlay: (id: string) => void;

  setFilter: (id: FilterId) => void;
  setClipFilter: (clipId: string, id: FilterId) => void;
  setClipContentTransform: (
    clipId: string,
    patch: Partial<
      Pick<EditorClip, 'contentScale' | 'contentOffsetX' | 'contentOffsetY' | 'contentRotation'>
    >,
  ) => void;
  toggleClipMuted: (clipId: string) => void;
  trimSelectedAtPlayhead: (edge: 'in' | 'out') => void;
  setPlayhead: (seconds: number) => void;
  setPlaying: (playing: boolean) => void;
  setPxPerSecond: (px: number) => void;
  setCanvasAspectId: (id: CanvasAspectId) => void;
  setCanvasBackgroundSolid: (color: string) => void;
  setCanvasBackgroundBlur: (type: CanvasBlurType) => void;
  setExportState: (patch: Partial<ExportState>) => void;
  hydrate: (composition: EditorComposition) => void;
  getCompositionSnapshot: () => EditorComposition;
  reset: () => void;
}

const initialExport: ExportState = { phase: 'idle', progress: 0, error: null, outputUri: null };

export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  selectedClipId: null,
  mediaOverlays: [],
  selectedMediaOverlayId: null,
  overlays: [],
  filterId: 'none',
  playhead: 0,
  isPlaying: false,
  pxPerSecond: 60,
  canvasAspectId: 'original',
  canvasBackground: '#000000',
  canvasBackgroundMode: 'solid',
  canvasBlurType: 'regular',
  exportState: initialExport,

  addClip: (clip) =>
    set((s) => ({
      clips: [...s.clips, clip],
      selectedClipId: clip.id,
      selectedMediaOverlayId: null,
    })),

  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),

  selectClip: (id) => set({ selectedClipId: id, selectedMediaOverlayId: null }),

  addMediaOverlay: (overlay) =>
    set((s) => ({
      mediaOverlays: [...s.mediaOverlays, overlay],
      selectedMediaOverlayId: overlay.id,
      selectedClipId: null,
    })),

  removeMediaOverlay: (id) =>
    set((s) => ({
      mediaOverlays: s.mediaOverlays.filter((o) => o.id !== id),
      selectedMediaOverlayId: s.selectedMediaOverlayId === id ? null : s.selectedMediaOverlayId,
    })),

  selectMediaOverlay: (id) => set({ selectedMediaOverlayId: id, selectedClipId: null }),

  updateMediaOverlay: (id, patch) =>
    set((s) => ({
      mediaOverlays: s.mediaOverlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  setMediaOverlayTransform: (id, patch) =>
    set((s) => ({
      mediaOverlays: s.mediaOverlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  trimClip: (id, trimStart, trimEnd) =>
    set((s) => ({
      clips: s.clips.map((c) => {
        if (c.id !== id) return c;
        if (hasUnlimitedTrimOut(c.mediaType)) {
          const nextTrimEnd = Math.max(trimStart + 0.1, trimEnd);
          const nextTrimStart = Math.max(0, Math.min(trimStart, nextTrimEnd - 0.1));
          return {
            ...c,
            trimStart: nextTrimStart,
            trimEnd: nextTrimEnd,
            sourceDuration: Math.max(c.sourceDuration, nextTrimEnd),
          };
        }
        return {
          ...c,
          trimStart: Math.max(0, Math.min(trimStart, c.sourceDuration)),
          trimEnd: Math.max(trimStart + 0.1, Math.min(trimEnd, c.sourceDuration)),
        };
      }),
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

  reorderClip: (id, toIndex) =>
    set((s) => {
      const fromIndex = s.clips.findIndex((c) => c.id === id);
      if (fromIndex < 0 || toIndex < 0 || toIndex >= s.clips.length || fromIndex === toIndex) {
        return s;
      }
      const clips = [...s.clips];
      const [clip] = clips.splice(fromIndex, 1);
      clips.splice(toIndex, 0, clip);
      return { clips };
    }),

  setMediaOverlayStartTime: (id, startTime) =>
    set((s) => ({
      mediaOverlays: s.mediaOverlays.map((o) =>
        o.id === id ? { ...o, startTime: Math.max(0, startTime) } : o,
      ),
    })),

  trimMediaOverlay: (id, patch) =>
    set((s) => ({
      mediaOverlays: s.mediaOverlays.map((o) => {
        if (o.id !== id) return o;
        const trimStart = patch.trimStart ?? o.trimStart;
        const trimEnd = patch.trimEnd ?? o.trimEnd;
        const startTime = patch.startTime ?? o.startTime;
        if (hasUnlimitedTrimOut(o.mediaType)) {
          const nextTrimEnd = Math.max(trimStart + 0.1, trimEnd);
          const nextTrimStart = Math.max(0, Math.min(trimStart, nextTrimEnd - 0.1));
          return {
            ...o,
            startTime: Math.max(0, startTime),
            trimStart: nextTrimStart,
            trimEnd: nextTrimEnd,
            sourceDuration: Math.max(o.sourceDuration, nextTrimEnd),
          };
        }
        return {
          ...o,
          startTime: Math.max(0, startTime),
          trimStart: Math.max(0, Math.min(trimStart, o.sourceDuration)),
          trimEnd: Math.max(trimStart + 0.1, Math.min(trimEnd, o.sourceDuration)),
        };
      }),
    })),

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

  setClipContentTransform: (clipId, patch) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
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

  setCanvasAspectId: (id) => set({ canvasAspectId: id }),

  setCanvasBackgroundSolid: (color) =>
    set({ canvasBackgroundMode: 'solid', canvasBackground: color }),

  setCanvasBackgroundBlur: (type) => {
    if (type === 'none') {
      set({ canvasBackgroundMode: 'solid', canvasBackground: '#000000', canvasBlurType: type });
      return;
    }
    set({ canvasBackgroundMode: 'blur', canvasBlurType: type });
  },

  setExportState: (patch) => set((s) => ({ exportState: { ...s.exportState, ...patch } })),

  hydrate: (composition) =>
    set({
      clips: composition.clips,
      mediaOverlays: composition.mediaOverlays ?? [],
      overlays: composition.overlays,
      filterId: composition.filterId,
      canvasAspectId: composition.canvasAspectId,
      canvasBackground: composition.canvasBackground,
      canvasBackgroundMode: composition.canvasBackgroundMode,
      canvasBlurType: composition.canvasBlurType,
      pxPerSecond: composition.pxPerSecond,
      selectedClipId: null,
      selectedMediaOverlayId: null,
      playhead: 0,
      isPlaying: false,
      exportState: initialExport,
    }),

  getCompositionSnapshot: () => {
    const s = get();
    return {
      version: COMPOSITION_VERSION,
      clips: s.clips,
      mediaOverlays: s.mediaOverlays,
      overlays: s.overlays,
      filterId: s.filterId,
      canvasAspectId: s.canvasAspectId,
      canvasBackground: s.canvasBackground,
      canvasBackgroundMode: s.canvasBackgroundMode,
      canvasBlurType: s.canvasBlurType,
      pxPerSecond: s.pxPerSecond,
    };
  },

  reset: () =>
    set({
      clips: [],
      selectedClipId: null,
      mediaOverlays: [],
      selectedMediaOverlayId: null,
      overlays: [],
      filterId: 'none',
      playhead: 0,
      isPlaying: false,
      pxPerSecond: 60,
      canvasAspectId: 'original',
      canvasBackground: '#000000',
      canvasBackgroundMode: 'solid',
      canvasBlurType: 'regular',
      exportState: initialExport,
    }),
}));
