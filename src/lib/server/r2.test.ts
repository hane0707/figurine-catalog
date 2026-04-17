import { describe, it, expect, vi } from 'vitest';
import { buildR2Client, getPresignedPutUrl, deleteR2Object } from './r2';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: function (this: object) { return {}; },
  PutObjectCommand: function (input: unknown) { return input; },
  DeleteObjectCommand: function (input: unknown) { return input; },
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://example.r2.presigned.url/test'),
}));

const env = {
  CLOUDFLARE_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'key123',
  R2_SECRET_ACCESS_KEY: 'secret123',
  R2_BUCKET_NAME: 'figurine-catalog-photos',
} as unknown as App.Platform['env'];

describe('getPresignedPutUrl', () => {
  it('署名付きPUT URLを返す', async () => {
    const url = await getPresignedPutUrl(env, 'items/abc/orig_1.jpg', 'image/jpeg');
    expect(url).toBe('https://example.r2.presigned.url/test');
  });
});
