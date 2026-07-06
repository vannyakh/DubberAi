import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FFmpegOptions, runFFmpeg } from './run';

/** Cut a section of a video without re-encoding when possible. */
export async function trim(
  input: string,
  output: string,
  startSeconds: number,
  endSeconds: number,
  options?: FFmpegOptions
): Promise<void> {
  await runFFmpeg(
    [
      '-ss', String(startSeconds),
      '-to', String(endSeconds),
      '-i', input,
      '-c', 'copy',
      output,
    ],
    options
  );
}

/** Split a video into two files at the given timestamp. */
export async function split(
  input: string,
  outputA: string,
  outputB: string,
  atSeconds: number,
  options?: FFmpegOptions
): Promise<void> {
  await runFFmpeg(['-i', input, '-t', String(atSeconds), '-c', 'copy', outputA], options);
  await runFFmpeg(['-ss', String(atSeconds), '-i', input, '-c', 'copy', outputB], options);
}

/** Concatenate multiple videos (same codec) into one file. */
export async function merge(inputs: string[], output: string, options?: FFmpegOptions): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'vvt-merge-'));
  const listPath = join(dir, 'list.txt');
  try {
    const list = inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    await writeFile(listPath, list, 'utf8');
    await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', output], options);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Extract the audio track (mp3 by default, based on output extension). */
export async function extractAudio(input: string, output: string, options?: FFmpegOptions): Promise<void> {
  await runFFmpeg(['-i', input, '-vn', '-q:a', '2', output], options);
}

/** Grab a single frame as an image. */
export async function generateThumbnail(
  input: string,
  output: string,
  atSeconds: number = 0,
  options?: FFmpegOptions
): Promise<void> {
  await runFFmpeg(['-ss', String(atSeconds), '-i', input, '-frames:v', '1', '-q:v', '2', output], options);
}

/** Burn a subtitle file (SRT/ASS) into the video stream. */
export async function burnSubtitles(
  input: string,
  subtitlePath: string,
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  // ffmpeg filter paths on Windows need escaped drive colons
  const escaped = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  await runFFmpeg(['-i', input, '-vf', `subtitles='${escaped}'`, '-c:a', 'copy', output], options);
}

/** Replace or mix an audio track into a video (e.g. AI dub over original). */
export async function mixAudioIntoVideo(
  videoInput: string,
  audioInput: string,
  output: string,
  opts: { originalVolume?: number; dubVolume?: number } = {},
  options?: FFmpegOptions
): Promise<void> {
  const originalVolume = opts.originalVolume ?? 0.2;
  const dubVolume = opts.dubVolume ?? 1.0;
  await runFFmpeg(
    [
      '-i', videoInput,
      '-i', audioInput,
      '-filter_complex',
      `[0:a]volume=${originalVolume}[a0];[1:a]volume=${dubVolume}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      output,
    ],
    options
  );
}

export interface ExportOptions {
  /** e.g. 1920 for 1080p output height scaling */
  height?: 720 | 1080 | 2160;
  videoBitrate?: string;
  audioBitrate?: string;
}

/** Re-encode a video for final export at a target resolution. */
export async function exportVideo(
  input: string,
  output: string,
  opts: ExportOptions = {},
  options?: FFmpegOptions
): Promise<void> {
  const args = ['-i', input];
  if (opts.height) {
    args.push('-vf', `scale=-2:${opts.height}`);
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-b:v', opts.videoBitrate || '5M',
    '-c:a', 'aac',
    '-b:a', opts.audioBitrate || '192k',
    output
  );
  await runFFmpeg(args, options);
}
