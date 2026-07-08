/**
 * Initializes the opencut-wasm module (built with `wasm-pack --target web`).
 *
 * Must complete before any module that calls wasm exports at import time
 * (e.g. `media-time.ts` reads `TICKS_PER_SECOND()` top-level), so the app
 * entry point awaits this before dynamically importing the React tree.
 *
 * Load via the real pkg entry (`opencut_wasm.js`) so the `.wasm` file is
 * resolved with `import.meta.url` from the same directory. Passing a
 * separate `?url` import can desync after `pnpm build:wasm` when the
 * `file:` link in node_modules is not refreshed.
 */
import initWasm from "opencut-wasm/opencut_wasm";

let initPromise: Promise<void> | null = null;

export function initOpencutWasm(): Promise<void> {
	if (!initPromise) {
		initPromise = initWasm().then(() => undefined);
	}
	return initPromise;
}
