import amqp, { type ChannelModel, type Channel } from 'amqplib';

/**
 * Optional RabbitMQ integration. When RABBITMQ_URL is set and reachable, job
 * events are published to the "jobs" queue so workers can consume them
 * push-style. When it is not available, nothing breaks — workers keep
 * polling POST /api/jobs/claim as before.
 */

const RABBITMQ_URL = process.env.RABBITMQ_URL || '';
export const JOBS_QUEUE = 'jobs';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting = false;

async function connect(): Promise<void> {
  if (!RABBITMQ_URL || connecting || channel) return;
  connecting = true;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('close', () => {
      channel = null;
      connection = null;
      // Try again later; RabbitMQ is optional.
      setTimeout(() => void connect(), 15_000);
    });
    connection.on('error', () => undefined);
    channel = await connection.createChannel();
    await channel.assertQueue(JOBS_QUEUE, { durable: true });
    console.log('[queue] RabbitMQ connected');
  } catch (err) {
    connection = null;
    channel = null;
    console.warn(`[queue] RabbitMQ unavailable (optional): ${(err as Error).message}`);
    setTimeout(() => void connect(), 30_000);
  } finally {
    connecting = false;
  }
}

export function initQueue(): void {
  if (!RABBITMQ_URL) {
    console.log('[queue] RABBITMQ_URL not set — job events disabled (workers poll instead)');
    return;
  }
  void connect();
}

export interface JobEvent {
  event: 'created' | 'updated';
  jobId: string;
  projectId: string;
  kind: string;
  status: string;
}

/** Fire-and-forget publish; silently skipped when RabbitMQ is down. */
export function publishJobEvent(payload: JobEvent): void {
  if (!channel) return;
  try {
    channel.sendToQueue(JOBS_QUEUE, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  } catch {
    // Queue publish failures are non-fatal; polling still works.
  }
}

export async function closeQueue(): Promise<void> {
  try {
    await channel?.close();
    await connection?.close();
  } catch {
    // ignore shutdown errors
  }
}
