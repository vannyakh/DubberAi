export {};

/** Exposed by the Electron preload (apps/desktop/electron/preload.ts). */
declare global {
  interface Window {
    desktop?: {
      openVideoDialog: () => Promise<string | null>;
      saveFileDialog: (defaultName: string) => Promise<string | null>;
      platform: string;
      window: {
        minimize: () => void;
        toggleMaximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void;
      };
    };
  }
}
