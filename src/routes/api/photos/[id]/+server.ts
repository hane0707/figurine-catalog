// src/routes/api/photos/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, photos } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { deleteR2Object } from '$lib/server/r2';
import { photoPostSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';

const R2_KEY_PATTERN = /^(?:[a-zA-Z0-9_-]+\/)?items\/[a-zA-Z0-9_-]+\/(?:orig|thumb)_[a-zA-Z0-9_-]+\.(?:jpg|webp)$/;

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const body = await request.json() as { itemId: string; r2KeyOrig: string; r2KeyThumb: string; sortOrder?: number };

  const parsed = photoPostSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { itemId, r2KeyOrig, r2KeyThumb, sortOrder } = body;

  if (!R2_KEY_PATTERN.test(r2KeyOrig) || !R2_KEY_PATTERN.test(r2KeyThumb)) {
    throw error(400, '不正な R2 キー形式です');
  }

  const existing = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isCover = existing.length === 0 ? 1 : 0;

  await db.insert(photos).values({
    id: params.id,
    itemId,
    r2KeyOrig,
    r2KeyThumb,
    isCover,
    sortOrder: sortOrder ?? existing.length,
  });

  return json({ ok: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const env = platform!.env;

  const [photo] = await db.select().from(photos).where(eq(photos.id, params.id));
  if (!photo) throw error(404, '写真が見つかりません');

  await Promise.all([
    deleteR2Object(env, photo.r2KeyOrig),
    deleteR2Object(env, photo.r2KeyThumb),
  ]);

  await db.delete(photos).where(eq(photos.id, params.id));

  if (photo.isCover) {
    const [next] = await db
      .select()
      .from(photos)
      .where(eq(photos.itemId, photo.itemId))
      .orderBy(photos.sortOrder)
      .limit(1);
    if (next) {
      await db.update(photos).set({ isCover: 1 }).where(eq(photos.id, next.id));
    }
  }

  return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);

  const [photo] = await db.select().from(photos).where(eq(photos.id, params.id));
  if (!photo) throw error(404, '写真が見つかりません');

  await db.update(photos).set({ isCover: 0 }).where(eq(photos.itemId, photo.itemId));
  await db.update(photos).set({ isCover: 1 }).where(eq(photos.id, params.id));

  return json({ ok: true });
};
