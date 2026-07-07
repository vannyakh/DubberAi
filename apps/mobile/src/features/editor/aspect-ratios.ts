import { EditorClip } from './types';
import { clampPreviewAspect, projectPreviewAspectRatio } from './preview-aspect';

export type CanvasAspectId = 'original' | '9:16' | '1:1' | '16:9' | '4:3' | '3:4';

export interface CanvasAspectPreset {
  id: CanvasAspectId;
  label: string;
  /** Width / height; null = follow source footage. */
  ratio: number | null;
}

export const CANVAS_ASPECT_PRESETS: CanvasAspectPreset[] = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
];

export const CANVAS_BACKGROUND_PRESETS = [
  { id: 'black', label: 'Black', color: '#000000' },
  { id: 'white', label: 'White', color: '#FFFFFF' },
  { id: 'gray', label: 'Gray', color: '#1C1C1E' },
  { id: 'blur', label: 'Blur', color: '#2A2A2E' },
] as const;

export function resolveCanvasAspectRatio(
  clips: EditorClip[],
  aspectId: CanvasAspectId,
): number {
  const preset = CANVAS_ASPECT_PRESETS.find((p) => p.id === aspectId);
  if (!preset || preset.ratio == null) {
    return projectPreviewAspectRatio(clips);
  }
  return clampPreviewAspect(preset.ratio);
}

export function aspectBoxSize(ratio: number, max = 36): { width: number; height: number } {
  const safe = clampPreviewAspect(ratio);
  if (safe >= 1) {
    return { width: max, height: Math.max(16, max / safe) };
  }
  return { width: Math.max(16, max * safe), height: max };
}
