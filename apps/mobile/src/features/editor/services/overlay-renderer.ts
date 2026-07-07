import { Platform } from 'react-native';
import {
  createPicture,
  drawAsImageFromPicture,
  ImageFormat,
  matchFont,
  Skia,
} from '@shopify/react-native-skia';
import { TextOverlay } from '../types';
import { newOverlayFile, writeBase64 } from './files';

const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

/**
 * Renders text overlays with Skia into a transparent PNG at output resolution.
 * The PNG is composited onto the video by ffmpeg at export, so the burned-in
 * result matches the GPU preview exactly without needing drawtext/freetype.
 */
export function renderOverlayPng(
  overlays: TextOverlay[],
  width: number,
  height: number,
): string | null {
  if (overlays.length === 0) return null;

  const picture = createPicture((canvas) => {
    for (const overlay of overlays) {
      // Overlay font sizes are authored against the preview; scale to output.
      const fontSize = overlay.fontSize * (height / 480);
      const font = matchFont({ fontFamily, fontSize, fontWeight: 'bold' });
      const textWidth = font.measureText(overlay.text).width;
      const x = overlay.x * width - textWidth / 2;
      const y = overlay.y * height;

      const shadow = Skia.Paint();
      shadow.setColor(Skia.Color('rgba(0,0,0,0.6)'));
      canvas.drawText(overlay.text, x + 2, y + 2, shadow, font);

      const paint = Skia.Paint();
      paint.setColor(Skia.Color(overlay.color));
      canvas.drawText(overlay.text, x, y, paint, font);
    }
  }, { width, height });

  const image = drawAsImageFromPicture(picture, { width, height });
  const base64 = image.encodeToBase64(ImageFormat.PNG, 100);
  const file = writeBase64(newOverlayFile(), base64);
  return file.uri;
}
