import 'server-only';

import { DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { serverEnv } from '@/lib/env.server';
import {
  deleteManagedProductImages,
  getR2Endpoint,
  parseR2Config,
  type R2ObjectUploadInput,
} from './product-media';

let cachedClient: S3Client | null = null;

export function getR2Config() {
  return parseR2Config(serverEnv);
}

function getR2Client() {
  if (cachedClient) return cachedClient;

  const config = getR2Config();
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(config),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

export async function uploadObject({
  key,
  body,
  contentType,
  cacheControl,
}: R2ObjectUploadInput) {
  const config = getR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

export async function deleteObject(key: string) {
  const config = getR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  const config = getR2Config();

  if (keys.length === 1) {
    await deleteObject(keys[0]);
    return;
  }

  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: config.bucketName,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    })
  );
}

export async function deleteManagedProductImageUrls(urls: string[]) {
  const config = getR2Config();
  return deleteManagedProductImages({
    urls,
    r2Config: config,
    deleteObjects,
  });
}
