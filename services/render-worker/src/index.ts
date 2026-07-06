import { RenderJob } from '@video-voice-translator/types';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);

async function claimJob(): Promise<RenderJob | null> {
  try {
    const response = await fetch(`${API_URL}/api/jobs/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'render' }),
    });
    if (response.status === 204) return null;
    if (!response.ok) throw new Error(`claim failed: ${response.status}`);
    return (await response.json()) as RenderJob;
  } catch {
    // API not reachable yet; keep polling
    return null;
  }
}

async function updateJob(id: string, patch: Partial<RenderJob>): Promise<void> {
  await fetch(`${API_URL}/api/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

async function processJob(job: RenderJob): Promise<void> {
  console.log(`[render-worker] processing job ${job.id} for project ${job.projectId}`);
  // Placeholder render pipeline. Real implementation composes timeline clips
  // with @video-voice-translator/ffmpeg (trim/merge/mixAudioIntoVideo/exportVideo).
  for (let progress = 0; progress <= 100; progress += 20) {
    await updateJob(job.id, { progress });
    await new Promise((r) => setTimeout(r, 500));
  }
  await updateJob(job.id, { status: 'completed', progress: 100 });
  console.log(`[render-worker] job ${job.id} completed`);
}

async function main() {
  console.log(`[render-worker] started, polling ${API_URL} every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    const job = await claimJob();
    if (job) {
      try {
        await processJob(job);
      } catch (err) {
        console.error(`[render-worker] job ${job.id} failed:`, err);
        await updateJob(job.id, { status: 'failed', error: String(err) });
      }
    } else {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

main();
