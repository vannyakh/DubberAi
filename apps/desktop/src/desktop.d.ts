export {};

declare global {
  interface Window {
    desktop?: {
      openVideoDialog: () => Promise<string | null>;
      saveFileDialog: (defaultName: string) => Promise<string | null>;
      platform: string;
    };
  }
}
