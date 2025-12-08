import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { config } from './config.js';

const s3 = new S3Client({ region: config.storage.region });

export type SnapshotRecord = {
  snapshotId: string;
  s3Path: string;
  metadataPath: string;
};

export async function storeSnapshot(payload: {
  url: string;
  html: string;
  headers: Record<string, string>;
  fetchedAt: string;
  sourceType: string;
  license?: string | null;
}) {
  const snapshotId = randomUUID();
  const datePrefix = payload.fetchedAt.split('T')[0].replace(/-/g, '/');
  const baseKey = `snapshots/${datePrefix}/${snapshotId}`;
  const htmlKey = `${baseKey}.html`;
  const metaKey = `${baseKey}.meta.json`;

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: htmlKey,
        Body: payload.html,
        ContentType: 'text/html',
      })
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: metaKey,
        Body: JSON.stringify({
          url: payload.url,
          headers: payload.headers,
          fetched_at: payload.fetchedAt,
          source_type: payload.sourceType,
          license: payload.license ?? null,
        }),
        ContentType: 'application/json',
      })
    ),
  ]);

  return {
    snapshotId,
    s3Path: `s3://${config.storage.bucket}/${htmlKey}`,
    metadataPath: `s3://${config.storage.bucket}/${metaKey}`,
  } satisfies SnapshotRecord;
}






