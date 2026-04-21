// src/routes/api/items/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items, photos, purchaseInfo, handmadeInfo, itemTags, itemMaterials } from '$lib/server/db';
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

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  // isPublic / status の入力バリデーション
  if ('isPublic' in body && ![0, 1].includes(body.isPublic as number)) {
    throw error(400, 'isPublic は 0 または 1 のみ有効です');
  }
  if ('status' in body && !['owned', 'parted'].includes(body.status as string)) {
    throw error(400, 'status は owned または parted のみ有効です');
  }

  const itemFields = ['name', 'series', 'isHandmade', 'isPublic', 'purchaseInfoPublic', 'handmadeInfoPublic', 'status'];
  const itemUpdate: Record<string, unknown> = { updatedAt: now };
  for (const field of itemFields) {
    if (field in body) itemUpdate[field] = body[field];
  }
  await db.update(items).set(itemUpdate).where(eq(items.id, params.id));

  // purchaseInfo: フィールドを明示的にホワイトリスト化（mass assignment 防止）
  if (body.purchaseInfo !== undefined) {
    await db.delete(purchaseInfo).where(eq(purchaseInfo.itemId, params.id));
    if (body.purchaseInfo) {
      const pi = body.purchaseInfo as Record<string, unknown>;
      await db.insert(purchaseInfo).values({
        itemId: params.id,
        storeName: (pi.storeName as string | null) ?? null,
        eventName: (pi.eventName as string | null) ?? null,
        purchaseDate: (pi.purchaseDate as string | null) ?? null,
        purchasePrice: (pi.purchasePrice as number | null) ?? null,
        maker: (pi.maker as string | null) ?? null,
        artistName: (pi.artistName as string | null) ?? null,
      });
    }
  }

  // handmadeInfo: フィールドを明示的にホワイトリスト化（mass assignment 防止）
  if (body.handmadeInfo !== undefined) {
    await db.delete(handmadeInfo).where(eq(handmadeInfo.itemId, params.id));
    if (body.handmadeInfo) {
      const hi = body.handmadeInfo as Record<string, unknown>;
      await db.insert(handmadeInfo).values({
        itemId: params.id,
        productionStart: (hi.productionStart as string | null) ?? null,
        productionEnd: (hi.productionEnd as string | null) ?? null,
        notes: (hi.notes as string | null) ?? null,
      });
    }
  }

  // tagIds: アイテムタグの更新
  if (body.tagIds !== undefined) {
    await db.delete(itemTags).where(eq(itemTags.itemId, params.id));
    const ids = body.tagIds as string[];
    if (ids.length > 0) {
      await db.insert(itemTags).values(ids.map((tagId) => ({ itemId: params.id, tagId })));
    }
  }

  // materialIds: アイテム素材の更新
  if (body.materialIds !== undefined) {
    await db.delete(itemMaterials).where(eq(itemMaterials.itemId, params.id));
    const ids = body.materialIds as string[];
    if (ids.length > 0) {
      await db.insert(itemMaterials).values(ids.map((materialId) => ({ itemId: params.id, materialId })));
    }
  }

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
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
