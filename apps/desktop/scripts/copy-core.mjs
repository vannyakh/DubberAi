#!/usr/bin/env node
/**
 * Copies the native Rust core (rust/node, built by cargo) into
 * dist-electron/dubbercut_core.node where the preload requires it.
 * Cross-platform: picks the right dylib/so/dll name for the host.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.resolve(here, '../../../rust/target/release');

const names = {
  darwin: 'libdubbercut_core.dylib',
  linux: 'libdubbercut_core.so',
  win32: 'dubbercut_core.dll',
};

const source = path.join(releaseDir, names[process.platform] ?? names.linux);
const destination = path.resolve(here, '../dist-electron/dubbercut_core.node');

if (!existsSync(source)) {
  console.error(`native core not found at ${source} — run \`pnpm build:core\` (needs Rust)`);
  process.exit(1);
}

mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`copied ${source} -> ${destination}`);
