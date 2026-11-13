import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Dynamically read Cloudflare R2 credentials from process.env
 */
export function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || 'screentv').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || '').trim();

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

let s3Client = null;

export function isR2Configured() {
  const { accessKeyId, secretAccessKey } = getR2Config();
  return Boolean(accessKeyId && secretAccessKey);
}

export function getR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  // Always recreate or reuse client with active credentials
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Upload local file or buffer to Cloudflare R2 bucket
 */
export async function uploadToR2({ filePath, buffer, filename, mimeType }) {
  const client = getR2Client();
  const { bucketName, publicUrl } = getR2Config();

  if (!client) {
    throw new Error('Cloudflare R2 is not configured: R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is empty in server/.env');
  }

  const fileData = buffer || fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: fileData,
    ContentType: mimeType,
  });

  await client.send(command);

  // If a public domain/dev URL is configured, use it, else stream through server
  const url = publicUrl
    ? `${publicUrl.replace(/\/$/, '')}/${filename}`
    : `/api/uploads/stream/${filename}`;

  return {
    filename,
    bucket: bucketName,
    url,
    isR2: true,
  };
}

/**
 * Get readable stream from Cloudflare R2 (supports HTTP Range for video scrub)
 */
export async function getR2Stream({ filename, range }) {
  const client = getR2Client();
  const { bucketName } = getR2Config();

  if (!client) {
    throw new Error('Cloudflare R2 is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Range: range,
  });

  const response = await client.send(command);
  return response;
}

/**
 * Delete object from Cloudflare R2
 */
export async function deleteFromR2(filename) {
  const client = getR2Client();
  const { bucketName } = getR2Config();

  if (!client) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.warn(`[R2] Delete failed for ${filename}:`, err.message);
    return false;
  }
}

/**
 * Test connectivity to Cloudflare R2
 */
export async function testR2Connection() {
  const cfg = getR2Config();

  if (!cfg.accessKeyId || !cfg.secretAccessKey) {
    return {
      connected: false,
      reason: 'MISSING_CREDENTIALS',
      message: 'R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing in server/.env',
    };
  }

  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: cfg.bucketName,
      MaxKeys: 1,
    });
    const result = await client.send(command);
    return {
      connected: true,
      bucket: cfg.bucketName,
      accountId: cfg.accountId,
      itemCount: result.KeyCount || 0,
    };
  } catch (err) {
    return {
      connected: false,
      reason: 'AUTH_OR_NETWORK_ERROR',
      message: err.message,
    };
  }
}
