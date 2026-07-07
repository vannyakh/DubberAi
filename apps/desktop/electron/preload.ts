import { contextBridge, ipcRenderer } from 'electron';
import path from 'node:path';

export interface DesktopApi {
  openVideoDialog: () => Promise<string | null>;
  saveFileDialog: (defaultName: string) => Promise<string | null>;
  platform: NodeJS.Platform;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void;
  };
}

const api: DesktopApi = {
  openVideoDialog: () => ipcRenderer.invoke('dialog:openVideo'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:maximize-toggle'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChanged: (callback) => {
      const listener = (_event: unknown, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximized-changed', listener);
      return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    },
  },
};

contextBridge.exposeInMainWorld('desktop', api);

// Native Rust core (rust/node → dubbercut_core.node, copied next to this
// preload by the build:core script). When exposed, the web UI's core
// dispatch layer (apps/web/src/wasm/core-dispatch.ts) prefers it over WASM.
// contextBridge calls are synchronous, which the time API requires.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const core = require(path.join(__dirname, 'dubbercut_core.node'));
  contextBridge.exposeInMainWorld('desktopCore', {
    ticksPerSecond: core.ticksPerSecond,
    mediaTimeFromSeconds: core.mediaTimeFromSeconds,
    mediaTimeToSeconds: core.mediaTimeToSeconds,
    mediaTimeFromFrame: core.mediaTimeFromFrame,
    mediaTimeToFrame: core.mediaTimeToFrame,
    roundToFrame: core.roundToFrame,
    floorToFrame: core.floorToFrame,
    isFrameAligned: core.isFrameAligned,
    lastFrameTime: core.lastFrameTime,
    snappedSeekTime: core.snappedSeekTime,
    mediaTimeAdd: core.mediaTimeAdd,
    mediaTimeSub: core.mediaTimeSub,
    mediaTimeMin: core.mediaTimeMin,
    mediaTimeMax: core.mediaTimeMax,
    mediaTimeClamp: core.mediaTimeClamp,
    formatTimecode: core.formatTimecode,
    parseTimecode: core.parseTimecode,
    guessTimecodeFormat: core.guessTimecodeFormat,
  });
  console.log('[desktop] native core loaded');
} catch (error) {
  // Fall back silently to the WASM core when the addon is missing
  // (e.g. dev without a Rust toolchain).
  console.warn('[desktop] native core unavailable, using WASM:', error);
}
