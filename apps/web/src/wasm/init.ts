/**
 * Initializes the opencut-wasm module (built with `wasm-pack --target web`).
 *
 * Must complete before any module that calls wasm exports at import time
 * (e.g. `media-time.ts` reads `TICKS_PER_SECOND()` top-level), so the app
 * entry point awaits this before dynamically importing the React tree.
 */
import initWasm from "opencut-wasm";
import wasmUrl from "opencut-wasm/opencut_wasm_bg.wasm?url";

let initPromise: Promise<void> | null = null;

export function initOpencutWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = initWasm({ module_or_path: wasmUrl }).then(() => undefined);
  }
  return initPromise;
}
