import { readJson, writeJson } from '@/libs/local-storage';
import { CanvasAspectId } from '../aspect-ratios';
import { CanvasBackgroundMode, CanvasBlurType } from '../canvas-background';
import { DEFAULT_CLIP_CONTENT_TRANSFORM, EditorClip, FilterId, TextOverlay } from '../types';

const STORAGE_KEY = 'editor-compositions.json';
export const COMPOSITION_VERSION = 1 as const;

export interface EditorComposition {
  version: typeof COMPOSITION_VERSION;
  clips: EditorClip[];
  overlays: TextOverlay[];
  filterId: FilterId;
  canvasAspectId: CanvasAspectId;
  canvasBackground: string;
  canvasBackgroundMode: CanvasBackgroundMode;
  canvasBlurType: CanvasBlurType;
  pxPerSecond: number;
}

type CompositionMap = Record<string, EditorComposition>;

async function readMap(): Promise<CompositionMap> {
  return (await readJson<CompositionMap>(STORAGE_KEY)) ?? {};
}

async function writeMap(map: CompositionMap): Promise<void> {
  await writeJson(STORAGE_KEY, map);
}

export function emptyComposition(): EditorComposition {
  return {
    version: COMPOSITION_VERSION,
    clips: [],
    overlays: [],
    filterId: 'none',
    canvasAspectId: 'original',
    canvasBackground: '#000000',
    canvasBackgroundMode: 'solid',
    canvasBlurType: 'regular',
    pxPerSecond: 60,
  };
}

function normalizeClip(clip: EditorClip): EditorClip {
  const scale = clip.contentScale ?? DEFAULT_CLIP_CONTENT_TRANSFORM.contentScale;
  return {
    ...clip,
    contentScale: scale > 0 ? scale : DEFAULT_CLIP_CONTENT_TRANSFORM.contentScale,
    contentOffsetX: clip.contentOffsetX ?? DEFAULT_CLIP_CONTENT_TRANSFORM.contentOffsetX,
    contentOffsetY: clip.contentOffsetY ?? DEFAULT_CLIP_CONTENT_TRANSFORM.contentOffsetY,
    contentRotation: clip.contentRotation ?? DEFAULT_CLIP_CONTENT_TRANSFORM.contentRotation,
  };
}

function normalizeComposition(raw: EditorComposition | null): EditorComposition | null {
  if (!raw || raw.version !== COMPOSITION_VERSION) return null;
  if (!Array.isArray(raw.clips)) return null;
  return {
    version: COMPOSITION_VERSION,
    clips: raw.clips.map(normalizeClip),
    overlays: Array.isArray(raw.overlays) ? raw.overlays : [],
    filterId: raw.filterId ?? 'none',
    canvasAspectId: raw.canvasAspectId ?? 'original',
    canvasBackground: raw.canvasBackground ?? '#000000',
    canvasBackgroundMode: raw.canvasBackgroundMode ?? 'solid',
    canvasBlurType: raw.canvasBlurType ?? 'regular',
    pxPerSecond: raw.pxPerSecond ?? 60,
  };
}

export async function loadEditorComposition(projectId: string): Promise<EditorComposition | null> {
  const map = await readMap();
  return normalizeComposition(map[projectId] ?? null);
}

export async function saveEditorComposition(
  projectId: string,
  composition: EditorComposition,
): Promise<void> {
  const map = await readMap();
  map[projectId] = { ...composition, version: COMPOSITION_VERSION };
  await writeMap(map);
}

export async function deleteEditorComposition(projectId: string): Promise<void> {
  const map = await readMap();
  if (!(projectId in map)) return;
  delete map[projectId];
  await writeMap(map);
}
