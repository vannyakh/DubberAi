import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import {
  metadataJsonPlugin,
  resolveRepoMetadataPath,
} from './src/config/metadata-json-plugin';
import { resolveApiProxyTarget } from './src/config/resolve-api-proxy';

const rootDir = path.resolve(__dirname, '../..');
const metadataPath = resolveRepoMetadataPath(rootDir);

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = await resolveApiProxyTarget({
    basePort: Number(env.PORT || 4000),
    explicitUrl: env.VITE_API_URL || undefined,
  });

  return {
    plugins: [react(), tailwindcss(), metadataJsonPlugin({ metadataPath })],
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
      // Workspace packages (e.g. @dubbercut/i18n) must share one React
      // instance with the app or hooks like useMemo throw at runtime.
      dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
    },
    optimizeDeps: {
      exclude: ['opencut-wasm'],
      include: ['react', 'react-dom', 'react-i18next', 'i18next'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      fs: {
        allow: [rootDir],
      },
      // Relative /api/* calls (e.g. the OpenCut sounds panel) go to the
      // Fastify backend instead of falling through to index.html.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
