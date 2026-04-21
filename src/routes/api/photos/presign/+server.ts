// src/routes/api/photos/presign/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPresignedPutUrl, getPresignedGetUrl } from '$lib/server/r2';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const body = await request.json();
  const { itemId, photoId, contentType } = body as {
    itemId: string;
    photoId: string;
    contentType: string;
  };

  if (!itemId || !photoId || !contentType) throw error(400, '必須パラメータ不足');

  const prefix = platform!.env.R2_KEY_PREFIX ? `${platform!.env.R2_KEY_PREFIX}/` : '';
  const origKey = `${prefix}items/${itemId}/orig_${photoId}.jpg`;
  const thumbKey = `${prefix}items/${itemId}/thumb_${photoId}.webp`;

  const [origUrl, thumbUrl, thumbViewUrl] = await Promise.all([
    getPresignedPutUrl(platform!.env, origKey, contentType),
    getPresignedPutUrl(platform!.env, thumbKey, 'image/webp'),
    getPresignedGetUrl(platform!.env, thumbKey),
  ]);

  return json({ origUrl, thumbUrl, origKey, thumbKey, thumbViewUrl });
};
