import Redis from 'ioredis';

/**
 * Redis cache with graceful degradation: if REDIS_URL is unset or the server
 * is down, every operation quietly becomes a no-op and the API keeps serving
 * straight from the database.
 */

const REDIS_URL = process.env.REDIS_URL || '';

let redis: Redis | null = null;
let available = false;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    // Keep retrying in the background (Redis may come up later), but slowly.
    retryStrategy: (times) => Math.min(times * 2000, 30_000),
  });

  redis.on('ready', () => {
    available = true;
    console.log('[cache] Redis connected');
  });
  redis.on('error', (err) => {
    if (available) console.warn(`[cache] Redis error, falling back to DB: ${err.message}`);
    available = false;
  });
  redis.on('end', () => {
    available = false;
  });
} else {
  console.log('[cache] REDIS_URL not set — caching disabled');
}

export function cacheAvailable() {
  return available;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis || !available) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  if (!redis || !available) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // cache write failures are non-fatal
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis || !available || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // cache invalidation failures are non-fatal (entries expire via TTL)
  }
}

export async function closeCache(): Promise<void> {
  if (redis) await redis.quit().catch(() => undefined);
}
