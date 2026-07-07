import { clipDuration, EditorClip, FILTER_PRESETS, FilterId, TextOverlay, timelineDuration } from '../types';
import { newExportFile, toFfmpegPath } from './files';
import { saveToLibrary } from './media';
import { renderOverlayPng } from './overlay-renderer';

export interface ExportCallbacks {
  onPhase: (phase: 'preparing' | 'encoding' | 'saving') => void;
  onProgress: (fraction: number) => void;
}

function ffmpegAvailable(): typeof import('ffmpeg-expo') | null {
  try {
    // Throws in Expo Go / web where the native binary is not compiled in.
    const mod = require('ffmpeg-expo') as typeof import('ffmpeg-expo');
    mod.getVersion();
    return mod;
  } catch {
    return null;
  }
}

/**
 * Builds one ffmpeg invocation that trims each clip, concatenates them,
 * applies the color grade and composites the Skia-rendered overlay PNG.
 */
export function buildExportArgs(
  clips: EditorClip[],
  filterId: FilterId,
  overlayPngPath: string | null,
  outputPath: string,
): string[] {
  const preset = FILTER_PRESETS.find((p) => p.id === filterId);
  const withAudio = clips.every((c) => c.hasAudio);

  const args: string[] = ['-y'];
  for (const clip of clips) {
    args.push('-ss', clip.trimStart.toFixed(3), '-t', clipDuration(clip).toFixed(3));
    args.push('-i', toFfmpegPath(clip.uri));
  }
  if (overlayPngPath) {
    args.push('-i', toFfmpegPath(overlayPngPath));
  }

  const overlayIndex = clips.length;
  const filters: string[] = [];
  const n = clips.length;

  // Normalize each clip to a common size/fps/timebase so concat is safe.
  for (let i = 0; i < n; i++) {
    filters.push(
      `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,` +
        `pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`,
    );
    if (withAudio) {
      filters.push(`[${i}:a]aresample=48000[a${i}]`);
    }
  }

  const concatInputs = Array.from({ length: n }, (_, i) =>
    withAudio ? `[v${i}][a${i}]` : `[v${i}]`,
  ).join('');
  filters.push(
    `${concatInputs}concat=n=${n}:v=1:a=${withAudio ? 1 : 0}${withAudio ? '[vc][ac]' : '[vc]'}`,
  );

  let videoLabel = 'vc';
  if (preset?.ffmpegFilter) {
    filters.push(`[${videoLabel}]${preset.ffmpegFilter}[vg]`);
    videoLabel = 'vg';
  }
  if (overlayPngPath) {
    filters.push(`[${videoLabel}][${overlayIndex}:v]overlay=0:0[vo]`);
    videoLabel = 'vo';
  }

  args.push('-filter_complex', filters.join(';'));
  args.push('-map', `[${videoLabel}]`);
  if (withAudio) args.push('-map', '[ac]');

  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p');
  if (withAudio) args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-movflags', '+faststart', outputPath);

  return args;
}

/**
 * Full export pipeline: Skia overlay render -> ffmpeg encode -> photo library.
 * Returns the exported file uri.
 */
export async function exportTimeline(
  clips: EditorClip[],
  filterId: FilterId,
  overlays: TextOverlay[],
  callbacks: ExportCallbacks,
): Promise<string> {
  if (clips.length === 0) throw new Error('Add at least one clip before exporting.');

  const ffmpeg = ffmpegAvailable();
  if (!ffmpeg) {
    throw new Error(
      'Export needs the native FFmpeg module. Run a development build (expo run:ios / run:android) — Expo Go does not include it.',
    );
  }

  callbacks.onPhase('preparing');
  const overlayPng = renderOverlayPng(overlays, 1280, 720);
  const output = newExportFile();
  const args = buildExportArgs(clips, filterId, overlayPng, toFfmpegPath(output.uri));

  callbacks.onPhase('encoding');
  const totalMs = timelineDuration(clips) * 1000;
  const session = ffmpeg.run(args, {
    logLevel: 'warning',
    onProgress: (progress) => {
      if (totalMs > 0) {
        callbacks.onProgress(Math.min(1, progress.time / totalMs));
      }
    },
  });

  const result = await session.result;
  if (result.returnCode !== 0) {
    throw new Error(`Encoding failed (code ${result.returnCode}).`);
  }

  callbacks.onPhase('saving');
  await saveToLibrary(output.uri);
  return output.uri;
}
