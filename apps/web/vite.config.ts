import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const rootDir = path.resolve(__dirname, '../..');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envDir: rootDir,
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        // Route the bare specifier through the core dispatch shim so the
        // Electron desktop can serve the time API from the native Rust
        // addon. Subpath imports (opencut-wasm/...) still hit the real pkg.
        {
          find: /^opencut-wasm$/,
          replacement: path.resolve(__dirname, './src/wasm/core-dispatch.ts'),
        },
      ],
    },
    optimizeDeps: {
      exclude: ['opencut-wasm'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      fs: {
        allow: [rootDir],
      },
    },
  };
});
