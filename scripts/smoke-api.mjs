#!/usr/bin/env node
/**
 * End-to-end smoke test for apps/api: auth, project scoping, jobs.
 * Usage: node scripts/smoke-api.mjs [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:4000';
const email = `smoke-${Date.now()}@example.com`;
const password = 'password123';

let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  [ok] ${name}`);
  } catch (err) {
    failures++;
    console.log(`  [FAIL] ${name} — ${err.message}`);
  }
}

async function json(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
}

let token;
let projectId;
let uploadUrl;

await check('register returns session', async () => {
  const { status, data } = await json('POST', '/api/auth/register', { email, password, name: 'Smoke' });
  if (status !== 201 || !data?.token || data?.user?.email !== email) throw new Error(`status ${status}`);
  token = data.token;
});

await check('login works', async () => {
  const { status, data } = await json('POST', '/api/auth/login', { email, password });
  if (status !== 200 || !data?.token) throw new Error(`status ${status}`);
});

await check('login rejects wrong password', async () => {
  const { status } = await json('POST', '/api/auth/login', { email, password: 'wrong-password' });
  if (status !== 401) throw new Error(`expected 401, got ${status}`);
});

await check('me returns user', async () => {
  const { status, data } = await json('GET', '/api/auth/me', undefined, token);
  if (status !== 200 || data?.email !== email) throw new Error(`status ${status}`);
});

await check('projects require auth', async () => {
  const { status } = await json('GET', '/api/projects');
  if (status !== 401) throw new Error(`expected 401, got ${status}`);
});

await check('create project', async () => {
  const { status, data } = await json('POST', '/api/projects', { name: 'Smoke project' }, token);
  if (status !== 201 || !data?.id) throw new Error(`status ${status}`);
  projectId = data.id;
});

await check('list projects scoped to user', async () => {
  const { status, data } = await json('GET', '/api/projects', undefined, token);
  if (status !== 200 || !Array.isArray(data) || !data.some((p) => p.id === projectId)) {
    throw new Error(`status ${status}`);
  }
});

await check('create + claim job', async () => {
  const created = await json('POST', '/api/jobs', { projectId, kind: 'render' }, token);
  if (created.status !== 201) throw new Error(`create status ${created.status}`);
  const claimed = await json('POST', '/api/jobs/claim', { kind: 'render' });
  if (claimed.status !== 200 || claimed.data?.status !== 'processing') {
    throw new Error(`claim status ${claimed.status}`);
  }
});

await check('upload stores file', async () => {
  const form = new FormData();
  form.append('file', new Blob(['smoke-test-content'], { type: 'text/plain' }), 'smoke test.txt');
  const res = await fetch(`${BASE}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (res.status !== 201 || !data?.url) throw new Error(`status ${res.status}`);
  uploadUrl = data.url;
});

await check('download returns uploaded file', async () => {
  // Follows the redirect when the API is backed by R2.
  const res = await fetch(`${BASE}${uploadUrl}`);
  const body = await res.text();
  if (res.status !== 200 || body !== 'smoke-test-content') throw new Error(`status ${res.status}`);
});

await check('update project (cloud sync)', async () => {
  const { status, data } = await json(
    'PATCH',
    `/api/projects/${projectId}`,
    { transcript: '[00:01] Speaker 1: Hello' },
    token
  );
  if (status !== 200 || !data?.transcript) throw new Error(`status ${status}`);
});

console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
