/**
 * Desktop = the web studio (apps/web) in an Electron shell, so both
 * platforms are always identical.
 *
 *  - dev:  loads the web Vite dev server (VITE_DEV_SERVER_URL)
 *  - prod: serves the built web bundle (web-dist/, copied from apps/web/dist)
 *          over a custom app:// protocol with SPA fallback, so
 *          react-router's BrowserRouter works like it does on the web.
 */
import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const DIST_DIR = path.join(__dirname, '../web-dist');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let filePath = path.normalize(path.join(DIST_DIR, decodeURIComponent(pathname)));
    const valid =
      filePath.startsWith(DIST_DIR) && existsSync(filePath) && statSync(filePath).isFile();
    if (!valid) {
      // SPA fallback: unknown paths (react-router routes) get index.html
      filePath = path.join(DIST_DIR, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#111111',
    // Frameless: the web UI draws its own app bar (DesktopTitleBar) with
    // the window controls; macOS keeps inset traffic lights.
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 10 },
    ...(process.platform === 'linux' ? { frame: false } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Preload requires the native Rust core (.node addon), which the
      // default renderer sandbox forbids. Context isolation stays on.
      sandbox: false,
    },
  });

  const sendMaximized = () => win.webContents.send('window:maximized-changed', win.isMaximized());
  win.on('maximize', sendMaximized);
  win.on('unmaximize', sendMaximized);

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadURL('app://bundle/');
  }
}

app.whenReady().then(() => {
  if (!isDev) registerAppProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: native file dialogs (available to the web UI as window.desktop)
ipcMain.handle('dialog:openVideo', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({ defaultPath: defaultName });
  return result.canceled ? null : result.filePath;
});

// IPC: window controls for the custom app bar (Windows/Linux buttons)
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window:maximize-toggle', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('window:is-maximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});
