/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initOpencutWasm } from './wasm/init';

// The WASM module must be initialized before the app tree is evaluated:
// several modules (e.g. src/wasm/media-time.ts) call wasm exports at import
// time, so the React bootstrap is imported dynamically after init resolves.
initOpencutWasm()
  .then(() => import('./bootstrap'))
  .catch((error) => {
    console.error('Failed to initialize opencut-wasm:', error);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML =
        '<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:sans-serif;color:#999">Failed to load the editor engine. Please reload the page.</div>';
    }
  });
