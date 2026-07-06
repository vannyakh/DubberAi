import { spawn } from 'node:child_process';

export interface FFmpegOptions {
  /** Path to the ffmpeg binary. Defaults to "ffmpeg" on PATH (or FFMPEG_PATH env). */
  ffmpegPath?: string;
  /** Called with progress lines from ffmpeg stderr. */
  onProgress?: (line: string) => void;
}

function binPath(options?: FFmpegOptions, probe = false): string {
  if (probe) return process.env.FFPROBE_PATH || 'ffprobe';
  return options?.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg';
}

export function runFFmpeg(args: string[], options: FFmpegOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binPath(options), ['-y', ...args], { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      stderr += line;
      options.onProgress?.(line);
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}

export interface MediaInfo {
  durationSeconds: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
  format: string;
}

export function probe(inputPath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      binPath(undefined, true),
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', inputPath],
      { windowsHide: true }
    );
    let stdout = '';
    proc.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const video = data.streams?.find((s: any) => s.codec_type === 'video');
        const audio = data.streams?.find((s: any) => s.codec_type === 'audio');
        resolve({
          durationSeconds: parseFloat(data.format?.duration || '0'),
          width: video?.width,
          height: video?.height,
          hasAudio: !!audio,
          format: data.format?.format_name || 'unknown',
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
