import { create } from 'zustand';
import { readJson, writeJson } from '@/libs/local-storage';

export type AppMode = 'local' | 'cloud';

interface AppState {
  mode: AppMode | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enterLocalMode: () => Promise<void>;
  enterCloudMode: () => Promise<void>;
  resetMode: () => Promise<void>;
}

const MODE_KEY = 'app-mode.json';

export const useAppStore = create<AppState>((set) => ({
  mode: null,
  hydrated: false,

  hydrate: async () => {
    const saved = await readJson<{ mode: AppMode }>(MODE_KEY);
    set({ mode: saved?.mode ?? null, hydrated: true });
  },

  enterLocalMode: async () => {
    await writeJson(MODE_KEY, { mode: 'local' });
    set({ mode: 'local' });
  },

  enterCloudMode: async () => {
    await writeJson(MODE_KEY, { mode: 'cloud' });
    set({ mode: 'cloud' });
  },

  resetMode: async () => {
    await writeJson(MODE_KEY, { mode: null });
    set({ mode: null });
  },
}));

export function isCloudMode(): boolean {
  return useAppStore.getState().mode === 'cloud';
}
