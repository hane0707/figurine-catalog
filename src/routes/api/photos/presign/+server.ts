// src/routes/api/photos/presign/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPresignedPutUrl } from '$lib/server/r2';

export const POST: RequestHandler = async ({ request, platform }) => {
  const body = await request.json();
  const { itemId, photoId, contentType } = body as {
    itemId: string;
    photoId: string;
    contentType: string;
  };

  if (!itemId || !photoId || !contentType) throw error(400, '必須パラメータ不足');

  const origKey = `items/${itemId}/orig_${photoId}.jpg`;
  const thumbKey = `items/${itemId}/thumb_${photoId}.webp`;

  const [origUrl, thumbUrl] = await Promise.all([
    getPresignedPutUrl(platform!.env, origKey, contentType),
    getPresignedPutUrl(platform!.env, thumbKey, 'image/webp'),
  ]);

  return json({ origUrl, thumbUrl, origKey, thumbKey });
};
