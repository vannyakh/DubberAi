/** Pixel rect of media drawn with contentFit="contain" inside the canvas frame. */
export function containedMediaRect(
  frameWidth: number,
  frameHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): { x: number; y: number; width: number; height: number } {
  if (frameWidth <= 0 || frameHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const sourceW = mediaWidth > 0 ? mediaWidth : frameWidth;
  const sourceH = mediaHeight > 0 ? mediaHeight : frameHeight;
  const mediaAspect = sourceW / sourceH;
  const frameAspect = frameWidth / frameHeight;

  if (mediaAspect > frameAspect) {
    const width = frameWidth;
    const height = frameWidth / mediaAspect;
    return { x: 0, y: (frameHeight - height) / 2, width, height };
  }

  const height = frameHeight;
  const width = frameHeight * mediaAspect;
  return { x: (frameWidth - width) / 2, y: 0, width, height };
}

/** Position a content-sized layer at the contain-fitted media rect center. */
export function contentAnchorStyle(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): {
  position: 'absolute';
  left: number;
  top: number;
  width: number;
  height: number;
  marginLeft: number;
  marginTop: number;
} {
  return {
    position: 'absolute',
    left: rect.x + rect.width / 2,
    top: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height,
    marginLeft: -rect.width / 2,
    marginTop: -rect.height / 2,
  };
}

export interface PreviewContentTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Degrees clockwise. */
  rotation: number;
}

export function previewTransformStyle(
  frameWidth: number,
  frameHeight: number,
  transform: PreviewContentTransform,
): {
  transform: (
    | { translateX: number }
    | { translateY: number }
    | { rotate: string }
    | { scale: number }
  )[];
} {
  return {
    transform: [
      { translateX: transform.offsetX * frameWidth * 0.5 },
      { translateY: transform.offsetY * frameHeight * 0.5 },
      { rotate: `${transform.rotation}deg` },
      { scale: transform.scale },
    ],
  };
}
