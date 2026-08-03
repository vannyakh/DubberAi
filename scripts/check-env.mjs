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

for (const key of ['DATABASE_URL', 'AUTH_SECRET']) {
  console.log(`  [${has(key) ? 'ok' : 'MISSING'}] ${key}`);
  if (!has(key)) ok = false;
}

const hasHf = has('HF_TOKEN') || has('HUGGINGFACE_API_KEY');
const hasLlmTts = has('GEMINI_API_KEY') || hasHf;
console.log(
  `  [${hasLlmTts ? 'ok' : 'MISSING'}] LLM/TTS — GEMINI_API_KEY or HF_TOKEN`,
);
if (!hasLlmTts) ok = false;

console.log(
  `  [${has('OPENAI_API_KEY') || hasHf ? 'ok' : 'optional'}] OPENAI_API_KEY (Whisper STT; HF fallback if unset)`,
);
console.log(
  `  [${has('ANTHROPIC_API_KEY') || hasHf ? 'ok' : 'optional'}] ANTHROPIC_API_KEY (or HF fallback for auto-cut)`,
);
if (hasHf) {
  console.log('  [ok] HF_TOKEN — Hugging Face fallback for LLM/TTS');
}

process.exit(ok ? 0 : 1);
