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

console.log('Environment (.env / .env.local at repo root):');
const envContent = ['.env', '.env.local']
  .map((f) => resolve(process.cwd(), f))
  .filter((p) => existsSync(p))
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');
const has = (key) => Boolean(process.env[key]) || new RegExp(`^${key}=.+`, 'm').test(envContent);
for (const key of ['API_KEY_302', 'DATABASE_URL', 'AUTH_SECRET']) {
  console.log(`  [${has(key) ? 'ok' : 'MISSING'}] ${key}`);
  if (!has(key)) ok = false;
}

process.exit(ok ? 0 : 1);
