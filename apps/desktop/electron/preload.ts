import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopApi {
  openVideoDialog: () => Promise<string | null>;
  saveFileDialog: (defaultName: string) => Promise<string | null>;
  platform: NodeJS.Platform;
}

const api: DesktopApi = {
  openVideoDialog: () => ipcRenderer.invoke('dialog:openVideo'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('desktop', api);
