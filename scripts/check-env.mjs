#!/usr/bin/env node
/**
 * Verifies local prerequisites: ffmpeg/ffprobe on PATH and required env vars.
 * Usage: node scripts/check-env.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let ok = true;

function check(name, fn) {
  try {
    fn();
    console.log(`  [ok] ${name}`);
  } catch (err) {
    ok = false;
    console.log(`  [MISSING] ${name} — ${err.message}`);
  }
}

console.log('Binaries:');
check('ffmpeg', () => execSync('ffmpeg -version', { stdio: 'pipe' }));
check('ffprobe', () => execSync('ffprobe -version', { stdio: 'pipe' }));

console.log('Environment (.env.local at repo root):');
const envPath = resolve(process.cwd(), '.env.local');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
for (const key of ['GEMINI_API_KEY', 'KIRI_TTS_API_KEY']) {
  const present = process.env[key] || new RegExp(`^${key}=.+`, 'm').test(envContent);
  console.log(`  [${present ? 'ok' : 'MISSING'}] ${key}`);
  if (!present && key === 'GEMINI_API_KEY') ok = false;
}

process.exit(ok ? 0 : 1);
