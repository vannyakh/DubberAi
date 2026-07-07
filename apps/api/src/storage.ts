/**
 * Storage service with two drivers, selected by env:
 *
 *  - "r2":    Cloudflare R2 via the S3-compatible API. Enabled automatically
 *             when R2_ACCOUNT_ID / R2_BUCKET / R2_ACCESS_KEY_ID /
 *             R2_SECRET_ACCESS_KEY are set (or force with STORAGE_DRIVER=r2).
 *  - "local": Files on disk under UPLOAD_DIR (on Railway: the attached
 *             volume). Default when R2 is not configured.
 *
 * Downloads always go through GET /api/uploads/:key so stored URLs stay
 * stable regardless of driver: local streams from disk, R2 redirects to a
 * presigned (or public) bucket URL.
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
/** Optional: public bucket / custom domain, e.g. https://media.example.com */
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const SIGNED_URL_TTL_SECONDS = Number(process.env.R2_SIGNED_URL_TTL || 3600);

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

const r2Configured = Boolean(R2_ACCOUNT_ID && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

export type StorageDriver = 'r2' | 'local';
export const storageDriver: StorageDriver =
  (process.env.STORAGE_DRIVER as StorageDriver) || (r2Configured ? 'r2' : 'local');

let s3: S3Client | null = null;
function r2Client(): S3Client {
  if (!r2Configured) {
    throw new Error('R2 storage requested but R2_* environment variables are not set');
  }
  s3 ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

/** Streams an uploaded file into the configured backend. */
export async function putObject(key: string, body: Readable, contentType: string): Promise<void> {
  if (storageDriver === 'r2') {
    // Upload handles streams of unknown length (multipart under the hood).
    await new Upload({
      client: r2Client(),
      params: { Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType },
    }).done();
    return;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await pipeline(body, createWriteStream(path.join(UPLOAD_DIR, key)));
}

/** For R2: URL the client should be redirected to (public or presigned). */
export async function r2DownloadUrl(key: string): Promise<string> {
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${key}`;
  return getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

/** For local: readable stream + size, or null when the file doesn't exist. */
export async function localReadStream(
  key: string,
): Promise<{ stream: Readable; size: number } | null> {
  const filePath = path.join(UPLOAD_DIR, key);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return { stream: createReadStream(filePath), size: info.size };
  } catch {
    return null;
  }
}
