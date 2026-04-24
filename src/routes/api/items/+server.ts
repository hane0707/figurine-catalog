// src/routes/api/items/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { items, photos, itemTags, tags } from '$lib/server/db/schema';
import { generateId } from '$lib/utils/uuid';
import { getPresignedGetUrl } from '$lib/server/r2';
import { eq, like, and, or, inArray, exists, sql, desc, asc } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
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

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = getDb(platform!.env.DB);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const status = url.searchParams.get('status') ?? 'owned';
  const q = url.searchParams.get('q') ?? '';
  const tagsParam = url.searchParams.get('tags') ?? '';
  const tagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  const kind = url.searchParams.get('kind') ?? 'all';
  const sort = url.searchParams.get('sort') ?? 'recent';

  const tagFilter = tagIds.length > 0
    ? exists(
        db.select({ one: sql`1` })
          .from(itemTags)
          .where(and(eq(itemTags.itemId, items.id), inArray(itemTags.tagId, tagIds)))
      )
    : undefined;

  const kindFilter =
    kind === 'bought' ? eq(items.isHandmade, 0) :
    kind === 'handmade' ? eq(items.isHandmade, 1) :
    undefined;

  const publicFilter = locals.user ? undefined : eq(items.isPublic, 1);

  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      series: items.series,
      isHandmade: items.isHandmade,
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
        kindFilter,
        publicFilter,
      )
    )
    .orderBy(sort === 'oldest' ? asc(items.createdAt) : desc(items.createdAt))
    .limit(limit)
    .offset(offset);

  const itemsWithUrls = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      series: row.series,
      isHandmade: row.isHandmade,
      status: row.status,
      isPublic: row.isPublic,
      createdAt: row.createdAt,
      thumbUrl: row.r2KeyThumb
        ? await getPresignedGetUrl(platform!.env, row.r2KeyThumb)
        : null,
    }))
  );

  const itemIds = rows.map((r) => r.id);
  const tagRows = itemIds.length > 0
    ? await db
        .select({ itemId: itemTags.itemId, tagId: tags.id, tagName: tags.name })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(inArray(itemTags.itemId, itemIds))
    : [];

  const tagsByItemId = new Map<string, { id: string; name: string }[]>();
  for (const r of tagRows) {
    if (!tagsByItemId.has(r.itemId)) tagsByItemId.set(r.itemId, []);
    tagsByItemId.get(r.itemId)!.push({ id: r.tagId, name: r.tagName });
  }

  const itemsWithTags = itemsWithUrls.map((item) => ({
    ...item,
    tags: tagsByItemId.get(item.id) ?? [],
  }));

  return json({ items: itemsWithTags, offset, limit });
};
