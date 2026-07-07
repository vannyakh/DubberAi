import { Directory, File, Paths } from 'expo-file-system';

/**
 * Editor scratch space in the OS cache directory (the system may reclaim it
 * when storage runs low, which is exactly what we want for proxies/exports).
 */
const editorDir = () => new Directory(Paths.cache, 'editor');
const exportsDir = () => new Directory(editorDir(), 'exports');
const overlaysDir = () => new Directory(editorDir(), 'overlays');

function ensure(dir: Directory): Directory {
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Target path for the final encoded mp4. */
export function newExportFile(): File {
  return new File(ensure(exportsDir()), `dubbercut-${Date.now()}.mp4`);
}

/** Target path for the rendered Skia overlay PNG burned in at export. */
export function newOverlayFile(): File {
  return new File(ensure(overlaysDir()), `overlay-${Date.now()}.png`);
}

/** Writes base64 image bytes to a file and returns it. */
export function writeBase64(file: File, base64: string): File {
  file.write(base64, { encoding: 'base64' });
  return file;
}

/** Deletes all editor scratch files (exports stay until saved to library). */
export function clearEditorCache() {
  const dir = editorDir();
  if (dir.exists) dir.delete();
}

/** Strips the file:// scheme — ffmpeg wants plain filesystem paths. */
export function toFfmpegPath(uri: string): string {
  return uri.startsWith('file://') ? decodeURIComponent(uri.slice('file://'.length)) : uri;
}
