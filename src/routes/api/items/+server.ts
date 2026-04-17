// src/routes/api/items/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items } from '$lib/server/db';
import { generateId } from '$lib/utils/uuid';

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const id = generateId();
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
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const status = url.searchParams.get('status') ?? 'owned';
  const q = url.searchParams.get('q');

  const { eq, like, and } = await import('drizzle-orm');

  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      status: items.status,
      isPublic: items.isPublic,
      createdAt: items.createdAt,
    })
    .from(items)
    .where(
      and(
        eq(items.status, status),
        q ? like(items.name, `%${q}%`) : undefined,
      )
    )
    .orderBy(items.createdAt)
    .limit(limit)
    .offset(offset);

  return json({ items: rows, offset, limit });
};
