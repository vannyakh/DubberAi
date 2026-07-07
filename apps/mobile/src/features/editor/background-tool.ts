export type BackgroundToolId = 'color' | 'image' | 'blur' | 'brand';

export function sheetOpenForBackgroundTool(tool: BackgroundToolId | null): tool is 'color' | 'blur' {
  return tool === 'color' || tool === 'blur';
}

export const BACKGROUND_TOOLS: { id: BackgroundToolId; label: string }[] = [
  { id: 'color', label: 'Color' },
  { id: 'image', label: 'Image' },
  { id: 'blur', label: 'Blur' },
  { id: 'brand', label: 'Brand' },
];
