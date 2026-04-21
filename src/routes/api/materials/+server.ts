// src/routes/api/materials/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, materials, itemMaterials } from '$lib/server/db';
import { eq, sql, desc } from 'drizzle-orm';
import { generateId } from '$lib/utils/uuid';

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDb(platform!.env.DB);

  const frequent = await db
    .select({
      id: materials.id,
      name: materials.name,
      isPreset: materials.isPreset,
      useCount: sql<number>`count(${itemMaterials.materialId})`.as('use_count'),
    })
    .from(materials)
    .leftJoin(itemMaterials, eq(itemMaterials.materialId, materials.id))
    .groupBy(materials.id)
    .orderBy(desc(sql`use_count`))
    .limit(6);

  const all = await db.select().from(materials).orderBy(materials.name);

  return json({ frequent, all });
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const { name } = await request.json() as { name: string };
  const normalized = name.trim();
  if (!normalized) return json({ error: '素材名が空です' }, { status: 400 });

  const existing = await db.select().from(materials).where(
    sql`lower(${materials.name}) = lower(${normalized})`
  );
  if (existing.length > 0) return json(existing[0]);

  const id = generateId();
  await db.insert(materials).values({ id, name: normalized, isPreset: 0 });
  return json({ id, name: normalized, isPreset: 0 }, { status: 201 });
};
