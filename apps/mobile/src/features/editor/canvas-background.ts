export type CanvasBackgroundMode = 'solid' | 'blur';

export type CanvasBlurType = 'none' | 'original' | 'light' | 'regular' | 'strong';

export interface CanvasBlurPreset {
  id: CanvasBlurType;
  /** expo-image blurRadius (points). */
  radius: number;
  /** Dark scrim on top of the blurred fill. */
  scrim: number;
}

export const CANVAS_BLUR_PRESETS: CanvasBlurPreset[] = [
  { id: 'none', radius: 0, scrim: 0 },
  { id: 'original', radius: 0, scrim: 0 },
  { id: 'light', radius: 18, scrim: 0.18 },
  { id: 'regular', radius: 32, scrim: 0.28 },
  { id: 'strong', radius: 48, scrim: 0.38 },
];

export function canvasBlurRadius(type: CanvasBlurType): number {
  return CANVAS_BLUR_PRESETS.find((p) => p.id === type)?.radius ?? 32;
}

export function canvasBlurScrim(type: CanvasBlurType): number {
  return CANVAS_BLUR_PRESETS.find((p) => p.id === type)?.scrim ?? 0.28;
}

export function isBlurBackgroundType(type: CanvasBlurType): boolean {
  return type !== 'none';
}

/** @deprecated Use canvasBlurRadius — kept for any BlurView previews. */
export function canvasBlurIntensity(type: CanvasBlurType): number {
  return canvasBlurRadius(type);
}
