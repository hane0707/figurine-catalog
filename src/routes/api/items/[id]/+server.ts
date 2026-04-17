// src/routes/api/items/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items, photos, purchaseInfo, handmadeInfo } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { deleteR2Object } from '$lib/server/r2';

export const GET: RequestHandler = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const item = await db.query.items.findFirst({
    where: eq(items.id, params.id),
    with: {
      photos: { orderBy: (p: { sortOrder: import('drizzle-orm').AnyColumn }, ops: { asc: (col: import('drizzle-orm').AnyColumn) => import('drizzle-orm').SQL }) => [ops.asc(p.sortOrder)] },
      purchaseInfo: true,
      handmadeInfo: true,
      itemTags: { with: { tag: true } },
      itemMaterials: { with: { material: true } },
    },
  });

  if (!item) throw error(404, 'アイテムが見つかりません');
  return json(item);
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const itemFields = ['name', 'series', 'isHandmade', 'isPublic', 'purchaseInfoPublic', 'handmadeInfoPublic', 'status'];
  const itemUpdate: Record<string, unknown> = { updatedAt: now };
  for (const field of itemFields) {
    if (field in body) itemUpdate[field] = body[field];
  }
  await db.update(items).set(itemUpdate).where(eq(items.id, params.id));

  if (body.purchaseInfo !== undefined) {
    await db.delete(purchaseInfo).where(eq(purchaseInfo.itemId, params.id));
    if (body.purchaseInfo) {
      await db.insert(purchaseInfo).values({ itemId: params.id, ...body.purchaseInfo });
    }
  }

  if (body.handmadeInfo !== undefined) {
    await db.delete(handmadeInfo).where(eq(handmadeInfo.itemId, params.id));
    if (body.handmadeInfo) {
      await db.insert(handmadeInfo).values({ itemId: params.id, ...body.handmadeInfo });
    }
  }

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const env = platform!.env;

  const itemPhotos = await db.select().from(photos).where(eq(photos.itemId, params.id));
  await Promise.all(
    itemPhotos.flatMap((p) => [
      deleteR2Object(env, p.r2KeyOrig),
      deleteR2Object(env, p.r2KeyThumb),
    ])
  );

  await db.delete(items).where(eq(items.id, params.id));
  return json({ ok: true });
};
