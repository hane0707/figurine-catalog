import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function buildR2Client(env: App.Platform['env']): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function getPresignedPutUrl(
  env: App.Platform['env'],
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const client = buildR2Client(env);
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function getPresignedGetUrl(
  env: App.Platform['env'],
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = buildR2Client(env);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn },
  );
}

export async function deleteR2Object(env: App.Platform['env'], key: string): Promise<void> {
  const client = buildR2Client(env);
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
