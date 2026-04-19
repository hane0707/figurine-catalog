// src/routes/api/items/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items, photos, itemTags } from '$lib/server/db';
import { generateId } from '$lib/utils/uuid';
import { getPresignedGetUrl } from '$lib/server/r2';

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const clientId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined;
  const id = clientId ?? generateId();
  const now = new Date().toISOString();

  await db.insert(items).values({
    id,
    name: (body.name as string | null | undefined) ?? null,
    series: (body.series as string | null | undefined) ?? null,
    isHandmade: (body.isHandmade as number | null | undefined) ?? null,
    isPublic: 0,
    purchaseInfoPublic: 0,
    handmadeInfoPublic: 0,
    status: 'owned',
    createdAt: now,
    updatedAt: now,
  });

  return json({ id }, { status: 201 });
};

export const GET: RequestHandler = async ({ url, platform }) => {
  const db = getDb(platform!.env.DB);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const status = url.searchParams.get('status') ?? 'owned';
  const q = url.searchParams.get('q') ?? '';
  const tagsParam = url.searchParams.get('tags') ?? '';
  const tagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  const { eq, like, and, or, inArray, exists, sql, desc } = await import('drizzle-orm');

  // タグフィルタのサブクエリ（tagIds が指定されていれば）
  const tagFilter = tagIds.length > 0
    ? exists(
        db.select({ one: sql`1` })
          .from(itemTags)
          .where(and(eq(itemTags.itemId, items.id), inArray(itemTags.tagId, tagIds)))
      )
    : undefined;

  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      series: items.series,
      status: items.status,
      isPublic: items.isPublic,
      createdAt: items.createdAt,
      r2KeyThumb: photos.r2KeyThumb,
    })
    .from(items)
    .leftJoin(photos, and(eq(photos.itemId, items.id), eq(photos.isCover, 1)))
    .where(
      and(
        eq(items.status, status),
        q ? or(like(items.name, `%${q}%`), like(items.series, `%${q}%`)) : undefined,
        tagFilter,
      )
    )
    .orderBy(desc(items.createdAt))
    .limit(limit)
    .offset(offset);

  // presigned URLを生成
  const itemsWithUrls = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      series: row.series,
      status: row.status,
      isPublic: row.isPublic,
      createdAt: row.createdAt,
      thumbUrl: row.r2KeyThumb
        ? await getPresignedGetUrl(platform!.env, row.r2KeyThumb)
        : null,
    }))
  );

  return json({ items: itemsWithUrls, offset, limit });
};
