// src/routes/api/photos/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, photos } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { deleteR2Object } from '$lib/server/r2';

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const body = await request.json() as { itemId: string; r2KeyOrig: string; r2KeyThumb: string; sortOrder?: number };
  const { itemId, r2KeyOrig, r2KeyThumb, sortOrder } = body;

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
