import { Directory, File, Paths } from 'expo-file-system';

const dataDir = () => new Directory(Paths.document, 'dubbercut');

function ensureDataDir(): Directory {
  const dir = dataDir();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function dataFile(name: string): File {
  return new File(ensureDataDir(), name);
}

export async function readJson<T>(name: string): Promise<T | null> {
  const file = dataFile(name);
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

export async function writeJson(name: string, value: unknown): Promise<void> {
  const file = dataFile(name);
  await file.write(JSON.stringify(value));
}
